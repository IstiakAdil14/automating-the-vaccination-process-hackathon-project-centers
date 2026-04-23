import NextAuth from "next-auth";
import { authConfig, MANAGER_ONLY_ROUTES, PUBLIC_ROUTES } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

function fireAuthAudit(req: NextRequest, action: string, metadata: Record<string, unknown>): void {
  const url = new URL("/api/worker/audit/auth-event", req.url);
  fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "x-real-ip":       req.headers.get("x-real-ip") ?? "",
      "user-agent":      req.headers.get("user-agent") ?? "",
      "x-audit-secret":  process.env.AUDIT_INTERNAL_SECRET ?? "",
    },
    body: JSON.stringify({ action, metadata, timestamp: new Date().toISOString() }),
  }).catch(() => {});
}

export default auth(function proxy(
  req: NextRequest & { auth: ReturnType<typeof auth> extends Promise<infer T> ? T : never }
) {
  const { pathname } = req.nextUrl;
  const session = (req as unknown as { auth: { user?: { id?: string; role?: string; centerId?: string } } | null }).auth;
  const isLoggedIn = !!session?.user;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isLoggedIn && (pathname.startsWith("/login") || pathname.startsWith("/register")))
      return NextResponse.redirect(new URL("/worker/dashboard", req.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const hasCallback = req.nextUrl.searchParams.has("callbackUrl");
    if (!hasCallback && pathname !== "/login") {
      fireAuthAudit(req, "session_expired", { attemptedPath: pathname });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (MANAGER_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    if (session?.user?.role !== "center_manager") {
      return NextResponse.redirect(new URL("/worker/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|offline\\.html|icons/|screenshots/|public/|api/).*)"],
};
