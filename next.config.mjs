import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
