// lib/auth/index.ts
export { auth, signIn, signOut, handlers, AUTH_ERRORS } from "./auth";
export { authConfig, PUBLIC_ROUTES, MANAGER_ONLY_ROUTES, STAFF_ROUTES } from "./auth.config";
export {
  getServerSession,
  requireSession,
  requireManagerSession,
  requireApiSession,
  requireManagerApiSession,
} from "./getServerSession";
export type { AuthSession } from "./getServerSession";
