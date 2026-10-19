import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "./lib/security-headers";

/**
 * Sets the Content-Security-Policy per request so connect-src can name the
 * host that served the page (see lib/security-headers.ts). /api and /ws are
 * excluded: they are rewritten to the backend and WebSocket upgrades must not
 * pass through the proxy.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NODE_ENV !== "production",
    request.headers.get("host"),
  ));
  return response;
}

export const config = {
  matcher: ["/((?!api/|ws/|_next/static|_next/image).*)"],
};
