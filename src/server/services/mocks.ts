import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shortHash } from "@/lib/hash";
import { isReservedPath, normalizePath } from "@/lib/reserved";
import { businessError } from "@/lib/api";
import { routeIndex } from "@/server/route-index";
import { buildPrefixMap, effectivePath } from "@/server/folder-runtime";
import { HTTP_METHODS } from "@/lib/http";

const methodEnum = z.enum(HTTP_METHODS);

export const createMockSchema = z.object({
  method: methodEnum,
  path: z.string().min(1).max(512),
  name: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  folderId: z.string().optional().nullable(),
  responseMode: z.enum(["RULES", "SEQUENTIAL", "RANDOM"]).optional(),
});

export const updateMockSchema = z.object({
  method: methodEnum.optional(),
  path: z.string().min(1).max(512).optional(),
  name: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  folderId: z.string().optional().nullable(),
  responseMode: z.enum(["RULES", "SEQUENTIAL", "RANDOM"]).optional(),
  isEnabled: z.boolean().optional(),
  forcedResponseId: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

async function uniqueHash(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const h = shortHash();
    const exists = await prisma.mock.findUnique({ where: { hash: h } });
    if (!exists) return h;
  }
  throw new Error("Não foi possível gerar um hash único");
}

// Verifica o CAMINHO EFETIVO (prefixo da pasta + path) contra reservados e duplicidade.
async function assertPathAvailable(
  userId: string,
  method: string,
  path: string,
  folderId: string | null,
  ignoreId?: string,
) {
  const folders = await prisma.folder.findMany({
    where: { userId },
    select: { id: true, parentId: true, prefix: true },
  });
  const prefixMap = buildPrefixMap(folders);
  const effTarget = effectivePath(prefixMap, folderId, path);

  if (isReservedPath(effTarget)) {
    businessError(`O caminho "${effTarget}" é reservado (ex.: /painel, /docs) e não pode ser usado.`);
  }

  const others = await prisma.mock.findMany({
    where: { userId, method: method as never, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
    select: { path: true, folderId: true },
  });
  for (const o of others) {
    if (effectivePath(prefixMap, o.folderId, o.path) === effTarget) {
      businessError(`Já existe um mock ${method} ${effTarget}. URLs não podem ser duplicadas.`);
    }
  }
}

export async function listMocks(userId: string) {
  return prisma.mock.findMany({
    where: { userId },
    orderBy: [{ folderId: "asc" }, { order: "asc" }],
    select: {
      id: true,
      hash: true,
      method: true,
      path: true,
      name: true,
      folderId: true,
      isEnabled: true,
      order: true,
      responseMode: true,
      forcedResponseId: true,
      _count: { select: { responses: true } },
    },
  });
}

export async function getMock(userId: string, id: string) {
  const mock = await prisma.mock.findFirst({
    where: { id, userId },
    include: {
      responses: {
        orderBy: { order: "asc" },
        include: { rules: { orderBy: { order: "asc" } } },
      },
      middlewares: {
        orderBy: { order: "asc" },
        include: { middleware: { select: { id: true, name: true, isEnabled: true } } },
      },
    },
  });
  if (!mock) businessError("Mock não encontrado");

  const folders = await prisma.folder.findMany({
    where: { userId },
    select: { id: true, parentId: true, prefix: true },
  });
  const effPath = effectivePath(buildPrefixMap(folders), mock!.folderId, mock!.path);
  return { ...mock!, effectivePath: effPath };
}

export async function createMock(userId: string, raw: unknown) {
  const input = createMockSchema.parse(raw);
  const path = normalizePath(input.path);
  await assertPathAvailable(userId, input.method, path, input.folderId ?? null);
  const hash = await uniqueHash();

  const mock = await prisma.mock.create({
    data: {
      userId,
      hash,
      method: input.method,
      path,
      name: input.name ?? null,
      description: input.description ?? null,
      folderId: input.folderId ?? null,
      responseMode: input.responseMode ?? "RULES",
      responses: {
        create: [
          {
            label: "Resposta padrão",
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            bodyMode: "STATIC",
            body: "{}",
            isDefault: true,
            order: 0,
          },
        ],
      },
    },
    include: { responses: { include: { rules: true } } },
  });
  routeIndex.invalidate();
  return mock;
}

export async function updateMock(userId: string, id: string, raw: unknown) {
  const input = updateMockSchema.parse(raw);
  const current = await prisma.mock.findFirst({ where: { id, userId } });
  if (!current) businessError("Mock não encontrado");

  const nextMethod = input.method ?? current!.method;
  const nextPath = input.path ? normalizePath(input.path) : current!.path;
  const nextFolderId = input.folderId === undefined ? current!.folderId : input.folderId;
  if (input.method || input.path || input.folderId !== undefined) {
    await assertPathAvailable(userId, nextMethod, nextPath, nextFolderId, id);
  }

  try {
    const mock = await prisma.mock.update({
      where: { id },
      data: {
        method: input.method,
        path: input.path ? nextPath : undefined,
        name: input.name === undefined ? undefined : input.name,
        description: input.description === undefined ? undefined : input.description,
        folderId: input.folderId === undefined ? undefined : input.folderId,
        responseMode: input.responseMode,
        isEnabled: input.isEnabled,
        forcedResponseId: input.forcedResponseId === undefined ? undefined : input.forcedResponseId,
        order: input.order,
      },
    });
    routeIndex.invalidate();
    return mock;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError(`Já existe um mock ${nextMethod} ${nextPath}.`);
    }
    throw e;
  }
}

export async function deleteMock(userId: string, id: string) {
  const current = await prisma.mock.findFirst({ where: { id, userId } });
  if (!current) businessError("Mock não encontrado");
  await prisma.mock.delete({ where: { id } });
  routeIndex.invalidate();
}
