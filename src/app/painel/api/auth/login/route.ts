import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { handle, ok, apiError } from "@/lib/api";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const { username, password } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { username } });
    const valid = user && user.isActive && (await verifyPassword(password, user.passwordHash));
    if (!user || !valid) {
      return apiError("Usuário ou senha inválidos", 401);
    }

    await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return ok({ user: { id: user.id, username: user.username, role: user.role } });
  });
}
