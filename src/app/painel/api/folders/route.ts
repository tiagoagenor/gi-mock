import { handle, ok, created, requireApiUser } from "@/lib/api";
import { listFolders, createFolder } from "@/server/services/folders";

export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return ok(await listFolders(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return created(await createFolder(user.id, body));
  });
}
