import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function unauthorized() {
  return apiError("Não autenticado", 401);
}

// Garante um usuário logado; lança uma Response 401 quando ausente.
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

// Garante um usuário ADMIN; lança 401/403 quando não for o caso.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") throw apiError("Apenas administradores", 403);
  return user;
}

// Envolve um handler de rota, tratando 401 (Response lançada), Zod e erros comuns.
export function handle(
  fn: () => Promise<Response>,
): Promise<Response> {
  return fn().catch((err) => {
    if (err instanceof Response) return err;
    if (err instanceof ZodError) {
      return apiError("Dados inválidos", 422, { issues: err.flatten() });
    }
    if (err instanceof Error) {
      // Erros de negócio conhecidos usam prefixo "BUSINESS:"
      if (err.message.startsWith("BUSINESS:")) {
        return apiError(err.message.replace("BUSINESS:", "").trim(), 409);
      }
      if (err.message === "UNAUTHENTICATED") return unauthorized();
      console.error("[api] erro não tratado:", err);
      return apiError("Erro interno", 500);
    }
    return apiError("Erro interno", 500);
  });
}

export function businessError(message: string): never {
  throw new Error(`BUSINESS: ${message}`);
}
