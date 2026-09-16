import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo de 3 caracteres")
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use letras, números, ponto, hífen ou underline"),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").max(200),
  email: z.string().email().optional().nullable(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
});

export const updateUserSchema = z.object({
  password: z.string().min(6).max(200).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createUser(raw: unknown) {
  const input = createUserSchema.parse(raw);
  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email ?? null,
        role: input.role ?? "ADMIN",
        passwordHash: await hashPassword(input.password),
      },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return user;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError("Já existe um usuário com esse nome de usuário ou e-mail.");
    }
    throw e;
  }
}

async function countActiveAdmins(exceptId?: string): Promise<number> {
  return prisma.user.count({
    where: { role: "ADMIN", isActive: true, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
  });
}

export async function updateUser(currentUserId: string, id: string, raw: unknown) {
  const input = updateUserSchema.parse(raw);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) businessError("Usuário não encontrado");

  // Não deixar o sistema sem nenhum admin ativo.
  const willLoseAdmin =
    (input.isActive === false || (input.role && input.role !== "ADMIN")) &&
    target!.role === "ADMIN" &&
    target!.isActive;
  if (willLoseAdmin && (await countActiveAdmins(id)) === 0) {
    businessError("Não é possível remover o último administrador ativo.");
  }

  const data: Prisma.UserUpdateInput = {
    email: input.email === undefined ? undefined : input.email,
    role: input.role,
    isActive: input.isActive,
  };
  if (input.password) data.passwordHash = await hashPassword(input.password);

  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError("E-mail já em uso.");
    }
    throw e;
  }
}

export async function deleteUser(currentUserId: string, id: string) {
  if (id === currentUserId) businessError("Você não pode excluir a si mesmo.");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) businessError("Usuário não encontrado");
  if (target!.role === "ADMIN" && target!.isActive && (await countActiveAdmins(id)) === 0) {
    businessError("Não é possível excluir o último administrador ativo.");
  }
  await prisma.user.delete({ where: { id } });
}
