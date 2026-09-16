import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { updateResponse, deleteResponse } from "@/server/services/responses";

export function PATCH(req: Request, { params }: { params: Promise<{ rid: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { rid } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateResponse(user.id, rid, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ rid: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { rid } = await params;
    await deleteResponse(user.id, rid);
    return noContent();
  });
}
