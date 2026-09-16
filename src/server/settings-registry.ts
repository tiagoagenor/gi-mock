import "server-only";
import { prisma } from "@/lib/prisma";

const GLOBAL_HEADERS_KEY = "globalHeaders";

// Cache em globalThis para sobreviver ao HMR do dev e ser compartilhado entre
// os bundles das rotas (invalidação confiável).
const g = globalThis as unknown as { __globalHeaders?: Record<string, string> | null };

export async function getGlobalHeaders(): Promise<Record<string, string>> {
  if (g.__globalHeaders) return g.__globalHeaders;
  const s = await prisma.setting.findUnique({ where: { key: GLOBAL_HEADERS_KEY } });
  g.__globalHeaders = ((s?.value as Record<string, string>) ?? {}) || {};
  return g.__globalHeaders;
}

export function invalidateGlobalHeaders() {
  g.__globalHeaders = null;
}

export async function setGlobalHeaders(headers: Record<string, string>) {
  await prisma.setting.upsert({
    where: { key: GLOBAL_HEADERS_KEY },
    update: { value: headers },
    create: { key: GLOBAL_HEADERS_KEY, value: headers },
  });
  invalidateGlobalHeaders();
  return headers;
}
