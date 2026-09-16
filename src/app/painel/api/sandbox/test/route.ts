import { handle, ok, requireApiUser } from "@/lib/api";
import { runTest } from "@/server/services/test-run";

export const runtime = "nodejs";

// Executa um trecho de código no sandbox (usado por mocks e middlewares).
export function POST(req: Request) {
  return handle(async () => {
    await requireApiUser();
    const body = await req.json().catch(() => ({}));
    return ok(await runTest(body));
  });
}
