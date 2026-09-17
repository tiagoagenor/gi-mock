// Versão cliente do cálculo de prefixo de pasta (espelha src/server/folder-runtime.ts).

export interface FolderPrefixInfo {
  id: string;
  parentId: string | null;
  prefix: string;
}

export function normalizePrefix(p?: string | null): string {
  let s = (p ?? "").trim();
  if (!s) return "";
  if (!s.startsWith("/")) s = "/" + s;
  s = s.replace(/\/{2,}/g, "/");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s === "/" ? "" : s;
}

export function buildPrefixMap(folders: FolderPrefixInfo[]): Map<string, string> {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const memo = new Map<string, string>();
  function acc(id: string | null): string {
    if (!id) return "";
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const f = byId.get(id);
    if (!f) return "";
    memo.set(id, "");
    const val = acc(f.parentId) + normalizePrefix(f.prefix);
    memo.set(id, val);
    return val;
  }
  const map = new Map<string, string>();
  for (const f of folders) map.set(f.id, acc(f.id));
  return map;
}

export function effectivePath(
  prefixMap: Map<string, string>,
  folderId: string | null,
  path: string,
): string {
  const prefix = folderId ? (prefixMap.get(folderId) ?? "") : "";
  const p = path.startsWith("/") ? path : "/" + path;
  const joined = (prefix + p).replace(/\/{2,}/g, "/");
  if (joined === "") return "/";
  return joined.length > 1 && joined.endsWith("/") ? joined.slice(0, -1) : joined;
}
