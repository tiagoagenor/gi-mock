import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { handle, ok, apiError, requireApiUser } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "A nova senha precisa ter ao menos 6 caracteres").max(200),
});

export function POST(req: Request) {
  return handle(async () => {
    const sessionUser = await requireApiUser();
    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return apiError("Usuário não encontrado", 404);

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return apiError("Senha atual incorreta", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return ok({ ok: true });
  });
}
