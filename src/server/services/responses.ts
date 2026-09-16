import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { routeIndex } from "@/server/route-index";

const ruleSchema = z.object({
  target: z.enum([
    "QUERY",
    "HEADER",
    "BODY",
    "PATH_PARAM",
    "COOKIE",
    "METHOD",
    "REQUEST_NUMBER",
  ]),
  path: z.string().max(512).optional().nullable(),
  operator: z.enum([
    "EQUALS",
    "CONTAINS",
    "REGEX",
    "EXISTS",
    "NULL_OR_ABSENT",
    "GT",
    "LT",
  ]),
  value: z.string().max(4000).optional().nullable(),
  caseSensitive: z.boolean().optional(),
  invert: z.boolean().optional(),
});

export const updateResponseSchema = z.object({
  label: z.string().max(200).optional().nullable(),
  statusCode: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  bodyMode: z.enum(["STATIC", "SCRIPT"]).optional(),
  body: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  latencyMs: z.number().int().min(0).max(60000).optional(),
  rulesOperator: z.enum(["AND", "OR"]).optional(),
  isDefault: z.boolean().optional(),
  order: z.number().int().optional(),
  testRequest: z.string().max(100000).optional().nullable(),
  rules: z.array(ruleSchema).optional(),
});

async function assertOwner(userId: string, responseId: string) {
  const resp = await prisma.mockResponse.findFirst({
    where: { id: responseId, mock: { userId } },
    select: { id: true, mockId: true },
  });
  if (!resp) businessError("Response não encontrada");
  return resp!;
}

export async function assertMockOwner(userId: string, mockId: string) {
  const mock = await prisma.mock.findFirst({ where: { id: mockId, userId }, select: { id: true } });
  if (!mock) businessError("Mock não encontrado");
  return mock!;
}

export async function createResponse(userId: string, mockId: string) {
  await assertMockOwner(userId, mockId);
  const count = await prisma.mockResponse.count({ where: { mockId } });
  const resp = await prisma.mockResponse.create({
    data: {
      mockId,
      label: `Resposta ${count + 1}`,
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      bodyMode: "STATIC",
      body: "{}",
      order: count,
    },
    include: { rules: true },
  });
  routeIndex.invalidate();
  return resp;
}

export async function updateResponse(userId: string, responseId: string, raw: unknown) {
  const { mockId } = await assertOwner(userId, responseId);
  const input = updateResponseSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      // Só uma default por mock.
      await tx.mockResponse.updateMany({
        where: { mockId, NOT: { id: responseId } },
        data: { isDefault: false },
      });
    }
    await tx.mockResponse.update({
      where: { id: responseId },
      data: {
        label: input.label === undefined ? undefined : input.label,
        statusCode: input.statusCode,
        headers: input.headers === undefined ? undefined : input.headers,
        bodyMode: input.bodyMode,
        body: input.body === undefined ? undefined : input.body,
        code: input.code === undefined ? undefined : input.code,
        latencyMs: input.latencyMs,
        rulesOperator: input.rulesOperator,
        isDefault: input.isDefault,
        order: input.order,
        testRequest: input.testRequest === undefined ? undefined : input.testRequest,
      },
    });
    if (input.rules) {
      await tx.rule.deleteMany({ where: { responseId } });
      if (input.rules.length > 0) {
        await tx.rule.createMany({
          data: input.rules.map((r, i) => ({
            responseId,
            target: r.target,
            path: r.path ?? null,
            operator: r.operator,
            value: r.value ?? null,
            caseSensitive: r.caseSensitive ?? true,
            invert: r.invert ?? false,
            order: i,
          })),
        });
      }
    }
  });

  routeIndex.invalidate();
  return prisma.mockResponse.findUnique({
    where: { id: responseId },
    include: { rules: { orderBy: { order: "asc" } } },
  });
}

export async function deleteResponse(userId: string, responseId: string) {
  const { mockId } = await assertOwner(userId, responseId);
  const count = await prisma.mockResponse.count({ where: { mockId } });
  if (count <= 1) businessError("O mock precisa ter ao menos uma response.");
  await prisma.mockResponse.delete({ where: { id: responseId } });
  routeIndex.invalidate();
}
