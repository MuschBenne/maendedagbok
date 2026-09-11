import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateNonce } from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Next.js läser nonce ur CSP-headern på requesten och sätter den på sina egna skript.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Allt utom statiska filer, som inte behöver någon CSP.
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
      // Hoppa över prefetch från <Link>; de renderar ingen HTML.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
