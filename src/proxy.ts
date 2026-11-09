import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: it checks that a session cookie is present so
// signed-out visitors go straight to /login. Every page and API route still
// verifies the session against the database (src/lib/auth.ts).
const SESSION_COOKIE = "ve_session";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the login page, health check, Next internals and
  // public static files (fonts, brand assets, icons).
  matcher: ["/((?!login|api/health|_next/|brand/|favicon\\.ico|logo\\.|.*\\.(?:png|svg|jpg|ico|webmanifest)$).*)"],
};
