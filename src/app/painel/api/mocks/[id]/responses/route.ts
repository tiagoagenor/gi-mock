import { handle, created, requireApiUser } from "@/lib/api";
import { createResponse } from "@/server/services/responses";

export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    return created(await createResponse(user.id, id));
  });
}
