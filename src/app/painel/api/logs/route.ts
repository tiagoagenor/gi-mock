import { handle, ok, noContent, requireApiUser } from "@/lib/api";
import { listLogs, clearLogs, type LogFilters } from "@/server/services/logs";

export function GET(req: Request) {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const filters: LogFilters = {
      method: url.searchParams.get("method") ?? undefined,
      statusRange: (url.searchParams.get("statusRange") as LogFilters["statusRange"]) ?? undefined,
      mockId: url.searchParams.get("mockId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      take: url.searchParams.get("take") ? Number(url.searchParams.get("take")) : undefined,
    };
    return ok(await listLogs(filters));
  });
}

export function DELETE() {
  return handle(async () => {
    await requireApiUser();
    await clearLogs();
    return noContent();
  });
}
