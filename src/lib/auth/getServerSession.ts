// lib/auth/getServerSession.ts
// Typed server-side session helpers for Server Components and API route handlers.
// Never import `auth` from next-auth directly in app code — use these helpers
// so the return type is always fully typed and centerId is always present.

import { auth } from "./auth";
import { redirect } from "next/navigation";
import type { CenterRole } from "@/types/next-auth";

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: CenterRole;
    centerId: string;
  };
}

/**
 * Returns the current session or null.
 * Use in Server Components where unauthenticated state is valid.
 */
export async function getServerSession(): Promise<AuthSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as AuthSession;
}

/**
 * Returns the current session or redirects to /login.
 * Use in protected Server Components — guarantees a non-null session.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Returns the session only if the user has the center_manager role.
 * Redirects to /dashboard (403-equivalent) if role is insufficient.
 */
export async function requireManagerSession(): Promise<AuthSession> {
  const session = await requireSession();
  if (session.user.role !== "center_manager") redirect("/dashboard");
  return session;
}

/**
 * API route helper — returns session or throws a 401 Response.
 * Usage: const session = await requireApiSession(request)
 */
export async function requireApiSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/**
 * API route helper — requires center_manager role or throws 403.
 */
export async function requireManagerApiSession(): Promise<AuthSession> {
  const session = await requireApiSession();
  if (session.user.role !== "center_manager") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
