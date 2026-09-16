// Acesso central às variáveis de ambiente do servidor.
function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return v;
}

export const env = {
  DATABASE_URL: () => required("DATABASE_URL"),
  AUTH_SECRET: () => required("AUTH_SECRET", "dev-only-change-me-please"),
  SANDBOX_TIMEOUT_MS: () => Number(process.env.SANDBOX_TIMEOUT_MS ?? "1000"),
  SANDBOX_MEMORY_MB: () => Number(process.env.SANDBOX_MEMORY_MB ?? "64"),
  SEED_ADMIN_USER: () => process.env.SEED_ADMIN_USER ?? "admin",
  SEED_ADMIN_PASSWORD: () => process.env.SEED_ADMIN_PASSWORD ?? "admin123",
};
