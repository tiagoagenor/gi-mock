import "server-only";
import { prisma } from "@/lib/prisma";
import type { SandboxLib } from "@/server/sandbox/runner";

let cache: SandboxLib[] | null = null;

export async function getEnabledLibs(): Promise<SandboxLib[]> {
  if (cache) return cache;
  const libs = await prisma.lib.findMany({ where: { isEnabled: true } });
  cache = libs.map((l) => ({
    name: l.name,
    kind: l.kind,
    packageName: l.packageName,
    sourceCode: l.sourceCode,
  }));
  return cache;
}

export function invalidateLibs() {
  cache = null;
}
