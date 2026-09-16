import { handle, ok, noContent, requireAdmin } from "@/lib/api";
import { updateUser, deleteUser } from "@/server/services/users";

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateUser(admin.id, id, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    await deleteUser(admin.id, id);
    return noContent();
  });
}
