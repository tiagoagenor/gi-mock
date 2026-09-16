import { handle, ok, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, hasScope } from "@/server/services/apikey-auth";

export const runtime = "nodejs";

export function GET(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  return handle(async () => {
    const auth = await authenticateApiKey(req);
    if (!auth) return apiError("API key inválida", 401);
    if (!hasScope(auth, "mock:read")) return apiError("Escopo insuficiente (mock:read)", 403);

    const { hash } = await params;
    const mock = await prisma.mock.findUnique({
      where: { hash },
      select: {
        hash: true,
        method: true,
        path: true,
        name: true,
        responseMode: true,
        forcedResponseId: true,
        responses: {
          orderBy: { order: "asc" },
          select: { id: true, label: true, statusCode: true, isDefault: true },
        },
      },
    });
    if (!mock) return apiError("Mock não encontrado", 404);
    return ok(mock);
  });
}
