import { handle, ok, created, requireAdmin } from "@/lib/api";
import { listUsers, createUser } from "@/server/services/users";

export function GET() {
  return handle(async () => {
    await requireAdmin();
    return ok(await listUsers());
  });
}

export function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    return created(await createUser(body));
  });
}
