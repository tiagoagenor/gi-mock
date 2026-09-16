import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "gimock_session";

// Caminhos públicos dentro de /painel (não exigem sessão).
function isPublic(pathname: string): boolean {
  return (
    pathname === "/painel/login" ||
    pathname === "/painel/api/auth/login" ||
    pathname.startsWith("/painel/api/public")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  // Sem sessão: API responde 401; páginas (painel e docs) redirecionam ao login.
  if (pathname.startsWith("/painel/api")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const loginUrl = new URL("/painel/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/painel/:path*", "/docs", "/docs/:path*"],
};
