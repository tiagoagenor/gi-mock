import { handle, ok, requireApiUser } from "@/lib/api";
import { runTest } from "@/server/services/test-run";

export const runtime = "nodejs";

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireApiUser();
    await params; // valida rota
    const body = await req.json().catch(() => ({}));
    return ok(await runTest(body));
  });
}
