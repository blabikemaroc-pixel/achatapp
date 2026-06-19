import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les réponses.
// HSTS n'a d'effet que derrière HTTPS (ignoré en http://localhost).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ['172.31.160.1'],
  // Les uploads (logos, justificatifs, preuves) passent par des Server Actions.
  // La limite par défaut est 1 Mo : on l'élève pour accepter scans/PDF.
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
