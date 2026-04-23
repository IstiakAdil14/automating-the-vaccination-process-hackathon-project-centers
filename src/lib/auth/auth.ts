import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { connectDB, CenterApplication, AuditLog } from "@/lib/db";
import { z } from "zod";
import mongoose from "mongoose";

function fireLoginAudit(
  action: "staff_login" | "staff_login_fail",
  centerId: string | null,
  meta: Record<string, unknown>
): void {
  const ANON = "000000000000000000000000";
  connectDB()
    .then(() =>
      AuditLog.create({
        centerId: new mongoose.Types.ObjectId(centerId ?? ANON),
        staffId:  new mongoose.Types.ObjectId(ANON),
        action,
        resourceType: "User",
        metadata: meta,
      })
    )
    .catch(() => {});
}

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "invalid_credentials",
  CENTER_INACTIVE:     "center_inactive",
  PENDING_APPROVAL:    "pending_approval",
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        await connectDB();

        // Find center by contact email, include hashedPassword
        // Query center_applications directly — password lives here
        const app = await CenterApplication.collection.findOne({ email: email.toLowerCase() });

        if (!app) {
          fireLoginAudit("staff_login_fail", null, { email, reason: "not_found" });
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        if (app.status === "pending_review") throw new Error(AUTH_ERRORS.PENDING_APPROVAL);
        if (app.status === "rejected")       throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);

        if (!app.hashedPassword) {
          fireLoginAudit("staff_login_fail", String(app._id), { email, reason: "no_password" });
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        const match = await bcrypt.compare(password, app.hashedPassword);
        if (!match) {
          fireLoginAudit("staff_login_fail", String(app._id), { email, reason: "wrong_password" });
          throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        fireLoginAudit("staff_login", String(app._id), { email });

        return {
          id:       String(app._id),
          name:     app.contactName,
          email:    app.email,
          role:     "center_manager" as const,
          centerId: String(app._id),
        };
      },
    }),
  ],
});
