import { getSessionUser } from "@/lib/auth/session";
import { handle, ok } from "@/lib/api";

export function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    return ok({ user });
  });
}
