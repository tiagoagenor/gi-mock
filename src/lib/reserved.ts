// Prefixos de path reservados: usuários NÃO podem criar mocks sob estes caminhos.
// (o painel e as rotas internas vivem sob /painel; /_next é do Next.js)
export const RESERVED_PREFIXES = ["/painel", "/docs", "/_next"];

export function isReservedPath(path: string): boolean {
  const p = normalizePath(path);
  return RESERVED_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(prefix + "/"),
  );
}

// Normaliza um path de mock: garante "/" inicial, remove barra final (exceto raiz),
// colapsa barras duplicadas.
export function normalizePath(path: string): string {
  let p = (path ?? "").trim();
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}
