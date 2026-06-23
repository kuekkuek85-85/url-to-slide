/** @type {import('next').NextConfig} */
const nextConfig = {
  // @sparticuz/chromium + playwright-core must be treated as external
  // (not bundled) in serverless functions, otherwise the binary is corrupted.
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
