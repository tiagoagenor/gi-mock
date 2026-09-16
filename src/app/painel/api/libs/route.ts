import { handle, ok, created, requireApiUser } from "@/lib/api";
import { listLibs, createLib } from "@/server/services/libs";

export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return ok(await listLibs(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return created(await createLib(user.id, body));
  });
}
