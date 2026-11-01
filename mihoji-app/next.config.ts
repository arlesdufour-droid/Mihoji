import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Les tests e2e et l'aperçu local utilisent http://127.0.0.1:3000 alors que le serveur écoute sur localhost.
  allowedDevOrigins: ['127.0.0.1'],
  partialPrefetching: true,
  async headers() {
    // Polices des sites générés : mises en cache durablement et utilisables depuis un aperçu isolé (iframe sandbox) ou un autre domaine.
    return [{ source: '/fonts/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }, { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }];
  },
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
