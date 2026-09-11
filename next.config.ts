/**
 * Next.js-konfiguration.
 *
 * Här sätts säkerhetsheaders som skickas med varje svar: tvinga https, förbjud
 * inbäddning i andra sajter, läck aldrig URL:en vidare och be sökmotorer att inte indexera.
 * CSP sätts inte här utan i src/proxy.ts, eftersom den innehåller en ny nonce per request.
 */
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Skicka aldrig URL:en vidare, t.ex. delningslänkar med token.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
