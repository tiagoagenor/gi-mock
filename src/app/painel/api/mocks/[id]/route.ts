import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { getMock, updateMock, deleteMock } from "@/server/services/mocks";

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    return ok(await getMock(user.id, id));
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return ok(await updateMock(user.id, id, body));
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteMock(user.id, id);
    return noContent();
  });
}
