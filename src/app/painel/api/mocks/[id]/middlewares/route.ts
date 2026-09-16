import { z } from "zod";
import { handle, ok, requireApiUser } from "@/lib/api";
import { setMockMiddlewares } from "@/server/services/middlewares";

const schema = z.object({ middlewareIds: z.array(z.string()) });

// Substitui a lista ordenada de middlewares vinculados ao mock.
export function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { middlewareIds } = schema.parse(body);
    await setMockMiddlewares(user.id, id, middlewareIds);
    return ok({ ok: true });
  });
}
