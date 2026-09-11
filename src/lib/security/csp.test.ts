/**
 * Tester för csp.ts.
 *
 * Kontrollerar att produktionsreglerna är strikta (bara skript med nonce, ingen eval)
 * och att lättnaderna för utveckling bara gäller i dev.
 */
import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "./csp";

describe("buildCsp", () => {
  it("tillåter bara skript med rätt nonce i produktion", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic';");
    expect(csp).toContain("style-src 'self' 'nonce-abc123';");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("tillåter eval och inline-stilar bara i dev", () => {
    const csp = buildCsp("abc123", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline';");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("generateNonce", () => {
  it("ger en ny, tillräckligt lång nonce varje gång", () => {
    const a = generateNonce();
    expect(a).not.toBe(generateNonce());
    expect(atob(a)).toHaveLength(16);
  });
});
