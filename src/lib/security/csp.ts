/**
 * Content-Security-Policy (CSP): regler till webbläsaren om vad sidan får ladda och köra.
 *
 * Här byggs regelsträngen och den slumpade nonce (engångskod) som proxy.ts använder.
 * Poängen: om någon lyckas smyga in ett eget <script> på sidan (XSS) saknar det
 * rätt nonce, och webbläsaren vägrar köra det.
 */

/** Bygger CSP-headern för en request. `isDev` lättar på reglerna lokalt. */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'unsafe-eval' behövs bara i dev: React använder eval för felsökningsinfo.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    // React renderar style-attribut på servern (t.ex. i graferna). Attribut kan inte köra kod.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // I dev körs sidan över http://localhost, där uppgradering till https skulle bryta.
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** 128 bitar slump, base64-kodat. Fungerar i både Node- och Edge-runtime. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
