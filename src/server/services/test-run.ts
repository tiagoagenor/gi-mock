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
});

export async function runTest(raw: unknown) {
  const { code, request } = testRunSchema.parse(raw);
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
  return result;
}
