import { handle, ok, apiError, requireApiUser } from "@/lib/api";
import { getLog } from "@/server/services/logs";

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const log = await getLog(id);
    if (!log) return apiError("Log não encontrado", 404);
    return ok(log);
  });
}
