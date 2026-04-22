// lib/auth/auth.ts
// Full NextAuth instance with Credentials provider.
// This file imports Mongoose — do NOT import it in middleware.ts (Edge runtime).
// Use authConfig from auth.config.ts in middleware instead.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { connectDB, User, Center, AuditLog } from "@/lib/db";
import { z } from "zod";
import mongoose from "mongoose";

// Fire-and-forget audit write — runs after authorize resolves
function fireLoginAudit(
  action: "staff_login" | "staff_login_fail",
  staffId: string | null,
  centerId: string | null,
  meta: Record<string, unknown>
): void {
  const ANON = "000000000000000000000000";
  connectDB()
    .then(() =>
      AuditLog.create({
        centerId:     new mongoose.Types.ObjectId(centerId ?? ANON),
        staffId:      new mongoose.Types.ObjectId(staffId  ?? ANON),
        action,
        resourceType: "User",
        metadata:     meta,
      })
    )
    .catch(() => {});
}

// ── Login input schema ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ── Custom auth error codes ───────────────────────────────────────────────────
// These are passed as the `error` query param on redirect to /login
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "invalid_credentials",
  ACCOUNT_SUSPENDED: "account_suspended",
  CENTER_INACTIVE: "center_inactive",
  NO_CENTER_ASSIGNED: "no_center_assigned",
  UNAUTHORIZED_ROLE: "unauthorized_role",
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      async profile(profile) {
        // Called after Google OAuth — look up the user by their Google email
        await connectDB();
        const user = await User.findOne({ email: profile.email.toLowerCase() })
          .select("+password")
          .lean();

        if (!user) throw new Error(AUTH_ERRORS.UNAUTHORIZED_ROLE);
        if (user.role !== "staff" && user.role !== "supervisor") throw new Error(AUTH_ERRORS.UNAUTHORIZED_ROLE);
        if (!user.isActive) throw new Error(AUTH_ERRORS.ACCOUNT_SUSPENDED);
        if (!user.centerId) throw new Error(AUTH_ERRORS.NO_CENTER_ASSIGNED);

        const center = await Center.findById(user.centerId).select("status").lean();
        if (!center || center.status !== "active") throw new Error(AUTH_ERRORS.CENTER_INACTIVE);

        User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).exec();
        fireLoginAudit("staff_login", String(user._id), String(user.centerId), {
          email: user.email,
          method: "google",
        });

        const role = user.role === "supervisor" ? "center_manager" : "staff";
        return { id: String(user._id), name: user.name, email: user.email, role, centerId: String(user.centerId) };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // 1. Validate input shape
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        await connectDB();

        // 2. Find user — explicitly select password (excluded by default)
        const user = await User.findOne({ email: email.toLowerCase() })
          .select("+password")
          .lean();

        if (!user) {
          fireLoginAudit("staff_login_fail", null, null, { email, reason: "user_not_found" });
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // 3. Role gate — only staff and supervisor (center_manager) can log in here
        if (user.role !== "staff" && user.role !== "supervisor") {
          throw new Error(AUTH_ERRORS.UNAUTHORIZED_ROLE);
        }

        // 4. Account active check
        if (!user.isActive) throw new Error(AUTH_ERRORS.ACCOUNT_SUSPENDED);

        // 5. Center assigned check
        if (!user.centerId) throw new Error(AUTH_ERRORS.NO_CENTER_ASSIGNED);

        // 6. Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          fireLoginAudit("staff_login_fail", String(user._id), String(user.centerId ?? null), {
            email,
            reason: "wrong_password",
          });
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // 7. Center active check
        const center = await Center.findById(user.centerId).select("status").lean();
        if (!center || center.status !== "active") {
          throw new Error(AUTH_ERRORS.CENTER_INACTIVE);
        }

        // 8. Update lastLogin (fire-and-forget)
        User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).exec();

        // 9. Map supervisor → center_manager for the JWT role
        const role = user.role === "supervisor" ? "center_manager" : "staff";

        // 10. Audit: login success
        fireLoginAudit("staff_login", String(user._id), String(user.centerId), {
          email: user.email,
          role,
        });

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role,
          centerId: String(user.centerId),
        };
      },
    }),
  ],
});
