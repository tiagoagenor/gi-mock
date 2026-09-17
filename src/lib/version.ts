// Metadados de versão capturados no build (via next.config.mjs → env NEXT_PUBLIC_*).
// Servem para conferir, em produção, se o código implantado foi atualizado.

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const GIT_COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

// Formata a data do build no fuso local, quando disponível.
export function formatBuildTime(iso: string = BUILD_TIME): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
