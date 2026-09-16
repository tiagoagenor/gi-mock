import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { getMiddleware, updateMiddleware, deleteMiddleware } from "@/server/services/middlewares";

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    return ok(await getMiddleware(user.id, id));
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateMiddleware(user.id, id, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteMiddleware(user.id, id);
    return noContent();
  });
}
