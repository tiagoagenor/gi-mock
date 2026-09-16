import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { updateLib, deleteLib } from "@/server/services/libs";

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateLib(user.id, id, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteLib(user.id, id);
    return noContent();
  });
}
