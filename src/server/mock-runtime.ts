import "server-only";
import { routeIndex, type CompiledResponse, type MockEntry } from "@/server/route-index";
import { rulesMatch, type MatchContext } from "@/server/rules-engine";
import { sandboxRunner, type SandboxCtxData, type SandboxLib } from "@/server/sandbox/runner";
import { getEnabledLibs } from "@/server/lib-registry";
import { getVars } from "@/server/var-registry";
import { logRequest } from "@/server/log-service";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Ruído de navegador que não deve poluir os logs.
function skipLogging(path: string): boolean {
  return (
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/apple-touch-icon.png" ||
    path === "/apple-touch-icon-precomposed.png" ||
    path.startsWith("/.well-known/")
  );
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function queryToObject(sp: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

async function readBody(req: Request): Promise<{ raw: string | null; parsed: unknown }> {
  if (req.method === "GET" || req.method === "HEAD") return { raw: null, parsed: null };
  const raw = await req.text().catch(() => "");
  if (!raw) return { raw: null, parsed: null };
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return { raw, parsed: JSON.parse(raw) };
    } catch {
      return { raw, parsed: raw };
    }
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    const obj: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(raw)) obj[k] = v;
    return { raw, parsed: obj };
  }
  return { raw, parsed: raw };
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => (out[k] = v));
  return out;
}

function selectResponse(
  entry: MockEntry,
  ctx: MatchContext,
): { response: CompiledResponse | null; matchedByRules: boolean } {
  const { mock } = entry;
  const responses = mock.responses;
  if (responses.length === 0) return { response: null, matchedByRules: false };

  if (mock.forcedResponseId) {
    const forced = responses.find((r) => r.id === mock.forcedResponseId);
    if (forced) return { response: forced, matchedByRules: false };
  }

  if (mock.responseMode === "SEQUENTIAL") {
    const idx = routeIndex.nextSequential(mock.id, responses.length);
    return { response: responses[idx], matchedByRules: false };
  }
  if (mock.responseMode === "RANDOM") {
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      matchedByRules: false,
    };
  }

  // RULES: primeira response (em ordem) cujas regras batem.
  for (const resp of responses) {
    if (resp.isDefault) continue;
    if (resp.rules.length === 0) continue;
    if (rulesMatch(resp.rules, resp.rulesOperator, ctx)) {
      return { response: resp, matchedByRules: true };
    }
  }
  const fallback = responses.find((r) => r.isDefault) ?? responses[0];
  return { response: fallback, matchedByRules: false };
}

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

interface MiddlewareOutcome {
  blocked?: { status: number; headers: Record<string, string>; body: string; middleware: string };
  state: Record<string, unknown>;
}

// Roda em ordem os middlewares vinculados. Se algum retornar um objeto com
// `status`, a requisição é BLOQUEADA com essa resposta. Caso contrário, o que
// vier em `state` é acumulado e repassado ao handler via ctx.state.
async function runMiddlewares(
  entry: MockEntry,
  base: SandboxCtxData,
  libs: SandboxLib[],
): Promise<MiddlewareOutcome> {
  let state: Record<string, unknown> = {};
  for (const bm of entry.middlewares) {
    const res = await sandboxRunner.runScript(bm.code, { ...base, state }, libs);
    if (!res.ok) {
      return {
        blocked: {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Erro no middleware",
            middleware: bm.name,
            detail: res.error?.message,
          }),
          middleware: bm.name,
        },
        state,
      };
    }
    const out = res.result as
      | undefined
      | { status?: number; headers?: Record<string, string>; body?: unknown; state?: Record<string, unknown> };
    if (out && typeof out === "object") {
      if (typeof out.status === "number") {
        const headers = { "Content-Type": "application/json", ...(out.headers ?? {}) };
        const b = out.body;
        const body = b == null ? "" : typeof b === "string" ? b : JSON.stringify(b);
        return { blocked: { status: out.status, headers, body, middleware: bm.name }, state };
      }
      if (out.state && typeof out.state === "object") {
        state = { ...state, ...out.state };
      }
    }
  }
  return { state };
}

export async function handleMock(req: Request): Promise<Response> {
  const started = Date.now();
  const url = new URL(req.url);
  const pathname = url.pathname;
  const noLog = skipLogging(pathname);
  const method = req.method.toUpperCase();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const resolved = await routeIndex.resolve(method, pathname);
  const query = queryToObject(url.searchParams);
  const reqHeaders = headersToObject(req.headers);
  const { raw: rawBody, parsed: parsedBody } = await readBody(req);

  if (!resolved) {
    // Requisição que não casou com nenhum mock: NÃO registra no log.
    return jsonResponse(404, {
      error: "Mock não encontrado",
      method,
      path: pathname,
    });
  }

  const { entry, params } = resolved;
  const mock = entry.mock;
  const requestNumber = routeIndex.bumpRequestNumber(mock.id);

  const matchCtx: MatchContext = {
    method,
    params,
    query,
    headers: Object.fromEntries(
      Object.entries(reqHeaders).map(([k, v]) => [k.toLowerCase(), v]),
    ),
    cookies: parseCookies(req.headers.get("cookie")),
    body: parsedBody,
    requestNumber,
  };

  // Variáveis globais + middlewares vinculados (rodam antes da resposta).
  const vars = await getVars();
  const baseCtxData: SandboxCtxData = {
    request: { method, url: req.url, ip },
    params,
    query,
    headers: matchCtx.headers,
    cookies: matchCtx.cookies,
    body: parsedBody,
    vars,
  };

  let middlewareState: Record<string, unknown> = {};
  if (entry.middlewares.length > 0) {
    const mwLibs = await getEnabledLibs();
    const mw = await runMiddlewares(entry, baseCtxData, mwLibs);
    if (mw.blocked) {
      const blockedRes = new Response(mw.blocked.body, {
        status: mw.blocked.status,
        headers: mw.blocked.headers,
      });
      if (!noLog)
        logRequest({
          mockId: mock.id,
          method,
          path: pathname,
          statusCode: mw.blocked.status,
          ip,
          requestHeaders: reqHeaders,
          requestQuery: query,
          requestBody: rawBody,
          responseHeaders: mw.blocked.headers,
          responseBody: mw.blocked.body,
          durationMs: Date.now() - started,
          scriptError: `bloqueado pelo middleware "${mw.blocked.middleware}"`,
        });
      return blockedRes;
    }
    middlewareState = mw.state;
  }

  const { response, matchedByRules } = selectResponse(entry, matchCtx);

  if (!response) {
    const res = jsonResponse(501, { error: "Nenhuma response configurada para este mock" });
    if (!noLog) logRequest({
      mockId: mock.id,
      method,
      path: pathname,
      statusCode: 501,
      ip,
      requestHeaders: reqHeaders,
      requestQuery: query,
      requestBody: rawBody,
      durationMs: Date.now() - started,
    });
    return res;
  }

  if (response.latencyMs > 0) await sleep(Math.min(response.latencyMs, 60000));

  let status = response.statusCode;
  const headers: Record<string, string> = {
    ...(response.headers as Record<string, string>),
  };
  let bodyOut: string | null = null;
  let scriptError: string | null = null;

  if (response.bodyMode === "SCRIPT" && response.code) {
    const ctxData: SandboxCtxData = { ...baseCtxData, state: middlewareState };
    const libs = await getEnabledLibs();
    const result = await sandboxRunner.runScript(response.code, ctxData, libs);
    if (result.ok && result.result) {
      if (typeof result.result.status === "number") status = result.result.status;
      Object.assign(headers, result.result.headers ?? {});
      const b = result.result.body;
      if (b === undefined || b === null) {
        bodyOut = "";
      } else if (typeof b === "string") {
        bodyOut = b;
      } else {
        bodyOut = JSON.stringify(b);
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
    } else {
      status = 500;
      scriptError = result.error?.message ?? "Erro no sandbox";
      headers["Content-Type"] = "application/json";
      bodyOut = JSON.stringify({ error: "Erro ao executar o código do mock", detail: scriptError });
    }
  } else {
    bodyOut = response.body ?? "";
  }

  const isHead = method === "HEAD";
  const finalBody = isHead ? null : bodyOut;
  const res = new Response(finalBody, { status, headers });

  if (!noLog)
    logRequest({
    mockId: mock.id,
    responseId: response.id,
    method,
    path: pathname,
    statusCode: status,
    ip,
    requestHeaders: reqHeaders,
    requestQuery: query,
    requestBody: rawBody,
    responseHeaders: headers,
    responseBody: bodyOut,
    responseBytes: bodyOut ? Buffer.byteLength(bodyOut) : 0,
    durationMs: Date.now() - started,
    matchedByRules,
    scriptError,
  });

  return res;
}
