import { handle, ok, created, requireApiUser } from "@/lib/api";
import { listVariables, createVariable } from "@/server/services/variables";

export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return ok(await listVariables(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return created(await createVariable(user.id, body));
  });
}
