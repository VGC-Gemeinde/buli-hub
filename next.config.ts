import type { NextConfig } from "next";

// Hosts allowed to reach the dev server cross-origin (e.g. a phone on the LAN
// at http://<host-ip>:3000). Without this, Next dev blocks the cross-origin
// HMR/asset requests and the page loads but never hydrates, so no controls
// work. Set DEV_LAN_ORIGIN in .env. Dev-only; no effect on production builds.
const allowedDevOrigins = (process.env.DEV_LAN_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
