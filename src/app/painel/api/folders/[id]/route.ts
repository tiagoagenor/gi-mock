import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { updateFolder, deleteFolder } from "@/server/services/folders";

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateFolder(user.id, id, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteFolder(user.id, id);
    return noContent();
  });
}
