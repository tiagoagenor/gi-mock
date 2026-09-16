import "server-only";
import { prisma } from "@/lib/prisma";

let cache: Record<string, string> | null = null;

export async function getVars(): Promise<Record<string, string>> {
  if (cache) return cache;
  const vars = await prisma.variable.findMany();
  cache = Object.fromEntries(vars.map((v) => [v.key, v.value]));
  return cache;
}

export function invalidateVars() {
  cache = null;
}
