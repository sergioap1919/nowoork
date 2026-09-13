import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 16 no longer uses `next export`. With `output: "export"`,
  // `next build` generates the static site in the /out folder.
  output: "export",
  images: {
    // Static exports do not have the Next.js image optimization server.
    unoptimized: true,
  },
};

export default nextConfig;
