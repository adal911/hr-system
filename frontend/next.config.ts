import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["http://192.168.1.17:3000", "http://localhost:3000", "http://127.0.0.1:3000"],
};

export default nextConfig;
