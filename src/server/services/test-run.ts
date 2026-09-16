import "server-only";
import { z } from "zod";
import { sandboxRunner, type SandboxCtxData } from "@/server/sandbox/runner";
import { getEnabledLibs } from "@/server/lib-registry";
import { getVars } from "@/server/var-registry";

export const testRunSchema = z.object({
  code: z.string().min(1).max(200000),
  request: z
    .object({
      method: z.string().optional(),
      url: z.string().optional(),
      params: z.record(z.string(), z.string()).optional(),
      query: z.record(z.string(), z.any()).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.any().optional(),
    })
    .optional(),
  // Config da resposta do mock (para o teste refletir o mesmo que o endpoint real).
  defaultStatus: z.number().int().min(100).max(599).optional(),
  defaultHeaders: z.record(z.string(), z.string()).optional(),
});

export async function runTest(raw: unknown) {
  const { code, request, defaultStatus, defaultHeaders } = testRunSchema.parse(raw);
  const [libs, vars] = await Promise.all([getEnabledLibs(), getVars()]);
  const ctxData: SandboxCtxData = {
    request: {
      method: request?.method ?? "GET",
      url: request?.url ?? "http://localhost/teste",
      ip: "127.0.0.1",
    },
    params: request?.params ?? {},
    query: request?.query ?? {},
    headers: request?.headers ?? {},
    cookies: {},
    body: request?.body ?? null,
    vars,
    state: {},
  };
  const result = await sandboxRunner.runScript(code, ctxData, libs);

  // Aplica status/headers do mock quando o código os omite (igual ao runtime).
  if (result.ok && result.result && defaultStatus !== undefined) {
    if (typeof result.result.status !== "number") result.result.status = defaultStatus;
    result.result.headers = { ...(defaultHeaders ?? {}), ...(result.result.headers ?? {}) };
  }

  return result;
}
