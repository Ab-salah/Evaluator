import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// Drop a file at public/logo.svg (or .png) to show it in the app header
// instead of the built-in mark. Detected at build time.
const logo = ["logo.svg", "logo.png"].find((name) => fs.existsSync(path.join(process.cwd(), "public", name)));

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  env: { NEXT_PUBLIC_LOGO_PATH: logo ? `/${logo}` : "" },
};

export default nextConfig;
