import "server-only";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/hash";

export interface ApiKeyAuth {
  id: string;
  userId: string;
  scopes: string[];
}

// Valida o header Authorization: Bearer <key>. Retorna a key ou null.
export async function authenticateApiKey(req: Request): Promise<ApiKeyAuth | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return null;

  const prefix = token.split("_").slice(0, 2).join("_"); // "mk_xxxxxxxx"
  const key = await prisma.apiKey.findUnique({ where: { prefix } });
  if (!key) return null;
  if (key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  if (key.keyHash !== sha256(token)) return null;

  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    id: key.id,
    userId: key.userId,
    scopes: (key.scopes as string[]) ?? [],
  };
}

export function hasScope(auth: ApiKeyAuth, scope: string): boolean {
  return auth.scopes.includes(scope);
}
