import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { invalidateVars } from "@/server/var-registry";

export const createVarSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use um identificador válido (ex.: JWT_SECRET)"),
  value: z.string().max(20000),
  secret: z.boolean().optional(),
});

export const updateVarSchema = z.object({
  value: z.string().max(20000).optional(),
  secret: z.boolean().optional(),
});

// Máscara para não expor segredos na listagem.
function mask(value: string): string {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

export async function listVariables(userId: string) {
  const vars = await prisma.variable.findMany({
    where: { userId },
    orderBy: { key: "asc" },
  });
  return vars.map((v) => ({
    id: v.id,
    key: v.key,
    value: v.secret ? mask(v.value) : v.value,
    secret: v.secret,
    masked: v.secret,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));
}

export async function createVariable(userId: string, raw: unknown) {
  const input = createVarSchema.parse(raw);
  try {
    const v = await prisma.variable.create({
      data: { userId, key: input.key, value: input.value, secret: input.secret ?? false },
    });
    invalidateVars();
    return { id: v.id, key: v.key, secret: v.secret };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError(`Já existe uma variável chamada "${input.key}".`);
    }
    throw e;
  }
}

export async function updateVariable(userId: string, id: string, raw: unknown) {
  const input = updateVarSchema.parse(raw);
  const v = await prisma.variable.findFirst({ where: { id, userId } });
  if (!v) businessError("Variável não encontrada");
  const updated = await prisma.variable.update({
    where: { id },
    data: {
      value: input.value === undefined ? undefined : input.value,
      secret: input.secret,
    },
  });
  invalidateVars();
  return { id: updated.id, key: updated.key, secret: updated.secret };
}

export async function deleteVariable(userId: string, id: string) {
  const v = await prisma.variable.findFirst({ where: { id, userId } });
  if (!v) businessError("Variável não encontrada");
  await prisma.variable.delete({ where: { id } });
  invalidateVars();
}
