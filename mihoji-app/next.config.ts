import type { NextConfig } from "next";

// Aperçu Codespaces : le navigateur passe par https://<codespace>-<port>.app.github.dev, un hôte que le serveur de dev ne connaît pas.
// On n'autorise que l'hôte exact de ce Codespace (pas tout *.app.github.dev).
const codespaceDevOrigin = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-${process.env.PORT ?? '3000'}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev'}`
  : null;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Les tests e2e et l'aperçu local utilisent http://127.0.0.1:3000 alors que le serveur écoute sur localhost.
  allowedDevOrigins: ['127.0.0.1', ...(codespaceDevOrigin ? [codespaceDevOrigin] : [])],
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
