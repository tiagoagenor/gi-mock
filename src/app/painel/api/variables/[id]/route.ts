import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { updateVariable, deleteVariable } from "@/server/services/variables";

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateVariable(user.id, id, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteVariable(user.id, id);
    return noContent();
  });
}
