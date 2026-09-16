import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";

export const createFolderSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().optional().nullable(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

function joinPath(parentPath: string | null, name: string): string {
  const base = parentPath && parentPath !== "/" ? parentPath : "";
  return `${base}/${name}`;
}

export async function listFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId },
    orderBy: [{ depth: "asc" }, { order: "asc" }, { name: "asc" }],
  });
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
  try {
    return await prisma.folder.create({
      data: {
        userId,
        name: input.name,
        parentId: input.parentId ?? null,
        path: joinPath(parentPath, input.name),
        depth,
      },
    });
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

  const newName = input.name ?? folder!.name;
  let newParentId = input.parentId === undefined ? folder!.parentId : input.parentId;

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
  });

  return prisma.folder.findUnique({ where: { id } });
}

export async function deleteFolder(userId: string, id: string) {
  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) businessError("Pasta não encontrada");
  // onDelete Cascade remove subpastas; mocks têm folderId setado para null.
  await prisma.folder.delete({ where: { id } });
}
