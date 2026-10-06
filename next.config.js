/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // native canvas binary for the server-rendered daily image
  experimental: { serverComponentsExternalPackages: ["@napi-rs/canvas"] },
};
module.exports = nextConfig;
