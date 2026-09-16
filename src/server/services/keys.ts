import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { generateApiKey } from "@/lib/hash";

export const ALL_SCOPES = ["response:set", "log:read", "mock:read"] as const;

export const createKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(ALL_SCOPES)).min(1).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function listKeys(userId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return keys;
}

// Retorna a key completa UMA vez (não é armazenada em claro).
export async function createKey(userId: string, raw: unknown) {
  const input = createKeySchema.parse(raw);
  const { fullKey, prefix, keyHash } = generateApiKey();
  const key = await prisma.apiKey.create({
    data: {
      userId,
      name: input.name,
      prefix,
      keyHash,
      scopes: input.scopes ?? [...ALL_SCOPES],
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
  return { ...key, fullKey };
}

export async function deleteKey(userId: string, id: string) {
  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) businessError("Chave não encontrada");
  await prisma.apiKey.delete({ where: { id } });
}
