import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { routeIndex } from "@/server/route-index";
import { normalizePrefix } from "@/server/folder-runtime";
import { RESERVED_PREFIXES } from "@/lib/reserved";

export const createFolderSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().optional().nullable(),
  prefix: z.string().max(512).optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().optional(),
  prefix: z.string().max(512).optional(),
  middlewareIds: z.array(z.string()).optional(),
});

function assertPrefixOk(prefix: string) {
  const p = normalizePrefix(prefix);
  if (p && RESERVED_PREFIXES.some((r) => p === r || p.startsWith(r + "/"))) {
    businessError(`O prefixo "${p}" é reservado (ex.: /painel, /docs).`);
  }
}

function joinPath(parentPath: string | null, name: string): string {
  const base = parentPath && parentPath !== "/" ? parentPath : "";
  return `${base}/${name}`;
}

export async function listFolders(userId: string) {
  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: [{ depth: "asc" }, { order: "asc" }, { name: "asc" }],
    include: { middlewares: { orderBy: { order: "asc" }, select: { middlewareId: true } } },
  });
  return folders.map((f) => ({
    id: f.id,
    userId: f.userId,
    name: f.name,
    parentId: f.parentId,
    prefix: f.prefix,
    order: f.order,
    path: f.path,
    depth: f.depth,
    middlewareIds: f.middlewares.map((m) => m.middlewareId),
  }));
}

export async function createFolder(userId: string, raw: unknown) {
  const input = createFolderSchema.parse(raw);
  let parentPath: string | null = null;
  let depth = 0;
  if (input.parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: input.parentId, userId },
    });
    if (!parent) businessError("Pasta pai não encontrada");
    parentPath = parent!.path;
    depth = parent!.depth + 1;
  }
  if (input.prefix) assertPrefixOk(input.prefix);
  try {
    const folder = await prisma.folder.create({
      data: {
        userId,
        name: input.name,
        parentId: input.parentId ?? null,
        prefix: normalizePrefix(input.prefix),
        path: joinPath(parentPath, input.name),
        depth,
      },
    });
    routeIndex.invalidate();
    return folder;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError("Já existe uma pasta com esse nome neste nível.");
    }
    throw e;
  }
}

async function isDescendant(userId: string, folderPath: string, candidateId: string): Promise<boolean> {
  const candidate = await prisma.folder.findFirst({ where: { id: candidateId, userId } });
  if (!candidate) return false;
  return candidate.path === folderPath || candidate.path.startsWith(folderPath + "/");
}

export async function updateFolder(userId: string, id: string, raw: unknown) {
  const input = updateFolderSchema.parse(raw);
  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) businessError("Pasta não encontrada");

  if (input.prefix !== undefined) assertPrefixOk(input.prefix);

  // Valida middlewares (se enviados).
  if (input.middlewareIds && input.middlewareIds.length > 0) {
    const count = await prisma.middleware.count({
      where: { id: { in: input.middlewareIds }, userId },
    });
    if (count !== new Set(input.middlewareIds).size) {
      businessError("Um ou mais middlewares são inválidos.");
    }
  }

  const newName = input.name ?? folder!.name;
  const newParentId = input.parentId === undefined ? folder!.parentId : input.parentId;

  // Impede mover para dentro de si mesma / descendente.
  if (newParentId && (await isDescendant(userId, folder!.path, newParentId))) {
    businessError("Não é possível mover a pasta para dentro dela mesma.");
  }

  let parentPath: string | null = null;
  let depth = 0;
  if (newParentId) {
    const parent = await prisma.folder.findFirst({ where: { id: newParentId, userId } });
    if (!parent) businessError("Pasta pai não encontrada");
    parentPath = parent!.path;
    depth = parent!.depth + 1;
  }

  const newPath = joinPath(parentPath, newName);
  const oldPath = folder!.path;

  await prisma.$transaction(async (tx) => {
    // Atualiza a própria pasta.
    try {
      await tx.folder.update({
        where: { id },
        data: {
          name: newName,
          parentId: newParentId,
          path: newPath,
          depth,
          order: input.order ?? folder!.order,
          prefix: input.prefix === undefined ? undefined : normalizePrefix(input.prefix),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        businessError("Já existe uma pasta com esse nome no destino.");
      }
      throw e;
    }

    // Reindexa os descendentes (path e depth).
    if (newPath !== oldPath) {
      const descendants = await tx.folder.findMany({
        where: { userId, path: { startsWith: oldPath + "/" } },
      });
      const depthDelta = depth - folder!.depth;
      for (const d of descendants) {
        await tx.folder.update({
          where: { id: d.id },
          data: {
            path: newPath + d.path.slice(oldPath.length),
            depth: d.depth + depthDelta,
          },
        });
      }
    }

    // Substitui os middlewares vinculados à pasta (se enviados).
    if (input.middlewareIds) {
      await tx.folderMiddleware.deleteMany({ where: { folderId: id } });
      if (input.middlewareIds.length > 0) {
        await tx.folderMiddleware.createMany({
          data: input.middlewareIds.map((middlewareId, i) => ({ folderId: id, middlewareId, order: i })),
        });
      }
    }
  });

  routeIndex.invalidate();
  return prisma.folder.findUnique({ where: { id } });
}

export async function deleteFolder(userId: string, id: string) {
  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) businessError("Pasta não encontrada");
  // onDelete Cascade remove subpastas; mocks têm folderId setado para null.
  await prisma.folder.delete({ where: { id } });
  routeIndex.invalidate();
}
