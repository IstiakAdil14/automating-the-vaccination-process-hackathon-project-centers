// lib/auth/auth.config.ts
// NextAuth configuration object — kept separate from auth.ts so it can be
// imported in middleware (Edge runtime) without pulling in Mongoose/Node APIs.

import type { NextAuthConfig } from "next-auth";

// Routes accessible without authentication
export const PUBLIC_ROUTES = ["/login", "/register", "/center/register"] as const;

// Routes only accessible by center_manager role
export const MANAGER_ONLY_ROUTES = [
  "/slots",
  "/staff",
  "/reports",
  "/settings",
  "/inventory",
  "/worker/staff",
  "/worker/audit",
  "/worker/settings",
  "/worker/reports",
] as const;

// Routes accessible by both staff and center_manager
export const STAFF_ROUTES = [
  "/dashboard",
  "/queue",
  "/vaccinations",
  "/appointments",
  "/profile",
] as const;

export const authConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login", // redirect auth errors back to login with ?error=
  },

  callbacks: {
    // ── authorized: runs in middleware (Edge) — no DB access ──────────────
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // Always allow public routes
      if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return true;

      // Not logged in → redirect to /login
      if (!isLoggedIn) return false;

      // Manager-only routes — reject staff role
      if (MANAGER_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
        return auth.user.role === "center_manager";
      }

      return true;
    },

    // ── jwt: called when token is created or refreshed ────────────────────
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.centerId = user.centerId;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    // ── session: shapes the client-visible session object ─────────────────
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.centerId = token.centerId;
      session.user.name = token.name ?? "";
      session.user.email = token.email ?? "";
      return session;
    },
  },
};
