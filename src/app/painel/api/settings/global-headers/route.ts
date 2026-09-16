import { z } from "zod";
import { handle, ok, requireApiUser } from "@/lib/api";
import { getGlobalHeaders, setGlobalHeaders } from "@/server/settings-registry";

const schema = z.object({ headers: z.record(z.string(), z.string()) });

export function GET() {
  return handle(async () => {
    await requireApiUser();
    return ok({ headers: await getGlobalHeaders() });
  });
}

export function PUT(req: Request) {
  return handle(async () => {
    await requireApiUser();
    const body = await req.json().catch(() => ({}));
    const { headers } = schema.parse(body);
    // remove chaves vazias
    const clean = Object.fromEntries(Object.entries(headers).filter(([k]) => k.trim()));
    return ok({ headers: await setGlobalHeaders(clean) });
  });
}
