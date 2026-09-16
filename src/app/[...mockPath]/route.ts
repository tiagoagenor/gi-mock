import { handleMock } from "@/server/mock-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Todos os verbos HTTP caem no runtime de mocks.
async function handler(req: Request): Promise<Response> {
  return handleMock(req);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as HEAD,
  handler as OPTIONS,
};
