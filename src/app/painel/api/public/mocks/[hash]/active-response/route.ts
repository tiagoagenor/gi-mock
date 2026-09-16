import { z } from "zod";
import { handle, ok, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { routeIndex } from "@/server/route-index";
import { authenticateApiKey, hasScope } from "@/server/services/apikey-auth";

export const runtime = "nodejs";

const schema = z.object({ responseId: z.string().min(1) });

export function POST(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  return handle(async () => {
    const auth = await authenticateApiKey(req);
    if (!auth) return apiError("API key inválida", 401);
    if (!hasScope(auth, "response:set")) return apiError("Escopo insuficiente (response:set)", 403);

    const { hash } = await params;
    const body = await req.json().catch(() => ({}));
    const { responseId } = schema.parse(body);

    const mock = await prisma.mock.findUnique({
      where: { hash },
      include: { responses: { select: { id: true } } },
    });
    if (!mock) return apiError("Mock não encontrado", 404);
    if (!mock.responses.some((r) => r.id === responseId)) {
      return apiError("Essa response não pertence a este mock", 422);
    }

    await prisma.mock.update({ where: { id: mock.id }, data: { forcedResponseId: responseId } });
    routeIndex.invalidate();
    return ok({ hash, forcedResponseId: responseId });
  });
}

export function DELETE(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  return handle(async () => {
    const auth = await authenticateApiKey(req);
    if (!auth) return apiError("API key inválida", 401);
    if (!hasScope(auth, "response:set")) return apiError("Escopo insuficiente (response:set)", 403);

    const { hash } = await params;
    const mock = await prisma.mock.findUnique({ where: { hash } });
    if (!mock) return apiError("Mock não encontrado", 404);

    await prisma.mock.update({ where: { id: mock.id }, data: { forcedResponseId: null } });
    routeIndex.invalidate();
    return ok({ hash, forcedResponseId: null });
  });
}
