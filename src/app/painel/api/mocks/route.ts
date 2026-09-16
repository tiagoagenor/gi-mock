import { handle, ok, created, requireApiUser } from "@/lib/api";
import { listMocks, createMock } from "@/server/services/mocks";

export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return ok(await listMocks(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return created(await createMock(user.id, body));
  });
}
