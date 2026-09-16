import { destroySession } from "@/lib/auth/session";
import { handle, ok } from "@/lib/api";

export function POST() {
  return handle(async () => {
    await destroySession();
    return ok({ ok: true });
  });
}
