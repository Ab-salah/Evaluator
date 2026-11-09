import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// Drop a file at public/logo.svg (or .png) to show it in the header. Detected
// here, at build time, because public/ is served from the CDN and is not on
// the server function's filesystem on Vercel: a runtime fs check in the
// layout always came back empty in production, so the logo never showed.
const logo = ["logo.svg", "logo.png"].find((name) =>
  fs.existsSync(path.join(process.cwd(), "public", name)),
);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  env: { NEXT_PUBLIC_LOGO_PATH: logo ? `/${logo}` : "" },
};

export default nextConfig;
