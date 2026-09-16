import { handle, noContent, requireApiUser } from "@/lib/api";
import { deleteKey } from "@/server/services/keys";

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteKey(user.id, id);
    return noContent();
  });
}
