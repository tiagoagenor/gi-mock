/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The mock sandbox runs user code with node:vm in worker threads on the
  // server. Keep server components external packages happy.
  serverExternalPackages: ["@faker-js/faker"],
  eslint: {
    // Linting is run separately; don't fail production builds on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
