import { handle, ok, created, requireApiUser } from "@/lib/api";
import { listMiddlewares, createMiddleware } from "@/server/services/middlewares";

export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return ok(await listMiddlewares(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return created(await createMiddleware(user.id, body));
  });
}
