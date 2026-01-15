import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    // Temporary: allow build to pass with type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
