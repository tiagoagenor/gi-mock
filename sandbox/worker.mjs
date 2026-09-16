// Worker de sandbox do GI-Mock.
// Executa o código .mjs do usuário como um ES Module real (vm.SourceTextModule),
// rodando com a flag --experimental-vm-modules (definida no execArgv do Worker).
//
// Isolamento: contexto vm sem require/process/fetch/fs/net. Os imports do usuário
// são resolvidos por uma allowlist (libs habilitadas no painel); qualquer outro
// import é rejeitado. Timeouts/loops infinitos são cortados pelo processo pai,
// que termina e recria este worker.

import { parentPort } from "node:worker_threads";
import vm from "node:vm";
import { faker } from "@faker-js/faker";
import * as jose from "jose";

// Helpers de JWT (HS256) expostos como ctx.jwt — úteis para login/validação.
const jwt = {
  async sign(payload, secret, opts = {}) {
    if (!secret) throw new Error("Segredo do JWT ausente (defina uma variável global, ex.: JWT_SECRET).");
    const key = new TextEncoder().encode(String(secret));
    let builder = new jose.SignJWT(payload ?? {})
      .setProtectedHeader({ alg: opts.alg ?? "HS256" })
      .setIssuedAt();
    if (opts.expiresIn) builder = builder.setExpirationTime(opts.expiresIn);
    if (opts.issuer) builder = builder.setIssuer(opts.issuer);
    if (opts.audience) builder = builder.setAudience(opts.audience);
    if (opts.subject) builder = builder.setSubject(opts.subject);
    return builder.sign(key);
  },
  async verify(token, secret) {
    if (!secret) throw new Error("Segredo do JWT ausente (defina uma variável global, ex.: JWT_SECRET).");
    const key = new TextEncoder().encode(String(secret));
    const { payload } = await jose.jwtVerify(String(token), key);
    return payload;
  },
  decode(token) {
    return jose.decodeJwt(String(token));
  },
};

function makeConsole(logs) {
  const push =
    (level) =>
    (...args) => {
      logs.push({
        level,
        message: args
          .map((a) => {
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" "),
      });
    };
  return { log: push("log"), info: push("info"), warn: push("warn"), error: push("error") };
}

async function buildLibModules(enabledLibs, context, logs) {
  // Retorna { moduleMap: Map<name, vm.Module>, libValues: {name: value} }
  const moduleMap = new Map();
  const libValues = {};

  // faker sempre disponível como import 'faker'
  const fakerMod = new vm.SyntheticModule(
    ["default", "faker"],
    function () {
      this.setExport("default", faker);
      this.setExport("faker", faker);
    },
    { context },
  );
  moduleMap.set("faker", fakerMod);

  for (const lib of enabledLibs ?? []) {
    if (!lib?.name || moduleMap.has(lib.name)) continue;
    try {
      if (lib.kind === "NPM_WHITELISTED" && lib.packageName) {
        // Importa dinamicamente o pacote realmente instalado em node_modules.
        let mod;
        try {
          mod = await import(lib.packageName);
        } catch (err) {
          logs.push({
            level: "warn",
            message: `Lib "${lib.name}" (${lib.packageName}) não pôde ser importada: ${err.message}`,
          });
          continue;
        }
        const value = mod.default ?? mod;
        const names = Array.from(new Set([...Object.keys(mod), "default"]));
        const syn = new vm.SyntheticModule(
          names,
          function () {
            for (const n of Object.keys(mod)) {
              try {
                this.setExport(n, mod[n]);
              } catch {
                /* export não-configurável: ignora */
              }
            }
            this.setExport("default", value);
          },
          { context },
        );
        moduleMap.set(lib.name, syn);
        libValues[lib.name] = value;
      } else if (lib.kind === "UTILITY" && lib.sourceCode) {
        const mod = new vm.SourceTextModule(lib.sourceCode, {
          context,
          identifier: `lib:${lib.name}`,
        });
        moduleMap.set(lib.name, mod);
      }
    } catch (err) {
      logs.push({ level: "warn", message: `Falha ao carregar lib "${lib.name}": ${err.message}` });
    }
  }

  return { moduleMap, libValues };
}

async function run({ code, ctxData, enabledLibs, timeoutMs }) {
  const logs = [];
  const sandboxConsole = makeConsole(logs);
  const context = vm.createContext({
    console: sandboxConsole,
    // Built-ins ECMAScript (Object, Array, JSON, Math, Date, Promise, etc.)
    // já existem no contexto vm. Nada de Node (require/process/fetch/fs).
  });

  const { moduleMap, libValues } = await buildLibModules(enabledLibs, context, logs);

  const linker = async (specifier) => {
    const mod = moduleMap.get(specifier);
    if (!mod) {
      throw new Error(
        `import "${specifier}" não é permitido no sandbox. Habilite a lib no painel para poder importá-la.`,
      );
    }
    return mod;
  };

  const userModule = new vm.SourceTextModule(code, {
    context,
    identifier: "handler.mjs",
  });

  await userModule.link(linker);
  // Avalia módulos de lib (utility) e o do usuário. Timeout síncrono do vm.
  await userModule.evaluate({ timeout: timeoutMs });

  const handler = userModule.namespace.default;
  if (typeof handler !== "function") {
    throw new Error("O código precisa ter um `export default` que seja uma função (handler).");
  }

  // Monta o contexto passado ao handler.
  const ctx = {
    ...ctxData,
    vars: ctxData.vars ?? {},
    state: ctxData.state ?? {},
    faker,
    jwt,
    libs: libValues,
    log: (...args) => sandboxConsole.log(...args),
  };

  const result = await handler(ctx);
  return { result, logs };
}

parentPort.on("message", async (job) => {
  try {
    const { result, logs } = await run(job);
    parentPort.postMessage({ id: job.id, ok: true, result, logs });
  } catch (err) {
    parentPort.postMessage({
      id: job.id,
      ok: false,
      error: { message: err?.message ?? String(err), stack: err?.stack ?? null },
      logs: [],
    });
  }
});
