import { handle, ok, created, requireApiUser } from "@/lib/api";
import { listKeys, createKey } from "@/server/services/keys";

export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return ok(await listKeys(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return created(await createKey(user.id, body));
  });
}
