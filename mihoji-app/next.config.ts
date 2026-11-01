import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Les tests e2e et l'aperçu local utilisent http://127.0.0.1:3000 alors que le serveur écoute sur localhost.
  allowedDevOrigins: ['127.0.0.1'],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
