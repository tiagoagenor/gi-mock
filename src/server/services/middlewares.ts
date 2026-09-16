import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { routeIndex } from "@/server/route-index";

// Middleware pronto de validação de JWT (usa ctx.jwt + variável global JWT_SECRET).
export const JWT_MIDDLEWARE_TEMPLATE = `// Middleware de validação de JWT.
// Lê o token do header Authorization, valida com o segredo global e, se OK,
// publica o payload em ctx.state.user para o mock usar. Caso contrário, bloqueia.
export default async function middleware(ctx) {
  const header = ctx.headers["authorization"] || "";
  const token = header.replace(/^Bearer\\s+/i, "").trim();

  if (!token) {
    return { status: 401, body: { error: "Token ausente" } };
  }

  try {
    const payload = await ctx.jwt.verify(token, ctx.vars.JWT_SECRET);
    // Continua para o mock; disponível em ctx.state.user
    return { state: { user: payload } };
  } catch (err) {
    return { status: 401, body: { error: "Token inválido", detail: String(err.message || err) } };
  }
}
`;

export const createMiddlewareSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  code: z.string().max(200000).optional(),
  isEnabled: z.boolean().optional(),
});

export const updateMiddlewareSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  code: z.string().max(200000).optional(),
  isEnabled: z.boolean().optional(),
});

export async function listMiddlewares(userId: string) {
  return prisma.middleware.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      isEnabled: true,
      updatedAt: true,
      _count: { select: { mocks: true } },
    },
  });
}

export async function getMiddleware(userId: string, id: string) {
  const mw = await prisma.middleware.findFirst({ where: { id, userId } });
  if (!mw) businessError("Middleware não encontrado");
  return mw;
}

export async function createMiddleware(userId: string, raw: unknown) {
  const input = createMiddlewareSchema.parse(raw);
  try {
    const mw = await prisma.middleware.create({
      data: {
        userId,
        name: input.name,
        description: input.description ?? null,
        code: input.code ?? JWT_MIDDLEWARE_TEMPLATE,
        isEnabled: input.isEnabled ?? true,
      },
    });
    routeIndex.invalidate();
    return mw;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError(`Já existe um middleware chamado "${input.name}".`);
    }
    throw e;
  }
}

export async function updateMiddleware(userId: string, id: string, raw: unknown) {
  const input = updateMiddlewareSchema.parse(raw);
  const mw = await prisma.middleware.findFirst({ where: { id, userId } });
  if (!mw) businessError("Middleware não encontrado");
  try {
    const updated = await prisma.middleware.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description === undefined ? undefined : input.description,
        code: input.code,
        isEnabled: input.isEnabled,
      },
    });
    routeIndex.invalidate();
    return updated;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError(`Já existe um middleware chamado "${input.name}".`);
    }
    throw e;
  }
}

export async function deleteMiddleware(userId: string, id: string) {
  const mw = await prisma.middleware.findFirst({ where: { id, userId } });
  if (!mw) businessError("Middleware não encontrado");
  await prisma.middleware.delete({ where: { id } });
  routeIndex.invalidate();
}

// Define (substitui) a lista ordenada de middlewares vinculados a um mock.
export async function setMockMiddlewares(userId: string, mockId: string, middlewareIds: string[]) {
  const mock = await prisma.mock.findFirst({ where: { id: mockId, userId }, select: { id: true } });
  if (!mock) businessError("Mock não encontrado");

  // valida que os middlewares pertencem ao usuário
  if (middlewareIds.length > 0) {
    const count = await prisma.middleware.count({
      where: { id: { in: middlewareIds }, userId },
    });
    if (count !== new Set(middlewareIds).size) {
      businessError("Um ou mais middlewares são inválidos.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.mockMiddleware.deleteMany({ where: { mockId } });
    if (middlewareIds.length > 0) {
      await tx.mockMiddleware.createMany({
        data: middlewareIds.map((middlewareId, i) => ({ mockId, middlewareId, order: i })),
      });
    }
  });
  routeIndex.invalidate();
}
