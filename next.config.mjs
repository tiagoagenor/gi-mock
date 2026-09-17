import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Versão/commit/data capturados no BUILD (inlined em NEXT_PUBLIC_*).
const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8"));
let gitCommit = "";
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim();
} catch {
  gitCommit = "";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // Fixa a raiz do Turbopack neste projeto (evita aviso de múltiplos lockfiles).
  turbopack: { root: __dirname },
  // The mock sandbox runs user code with node:vm in worker threads on the
  // server. Keep server components external packages happy.
  serverExternalPackages: ["@faker-js/faker"],
  eslint: {
    // Linting is run separately; don't fail production builds on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
