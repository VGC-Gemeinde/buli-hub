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
  experimental: {
    serverActions: {
      // Feedback reports carry up to 3 screenshots (6 MiB total, see
      // src/features/feedback/attachments.ts). The default is 1 MB, which a
      // single screenshot exceeds — the request would be rejected before the
      // action runs.
      bodySizeLimit: "12mb",
    },
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
