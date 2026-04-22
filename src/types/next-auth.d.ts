// types/next-auth.d.ts
// TypeScript declaration merging for NextAuth.
// Adds centerId, role, and userId to JWT token and Session so every
// component and API route gets full IntelliSense without casting.

import type { DefaultSession, DefaultJWT } from "next-auth";

export type CenterRole = "staff" | "center_manager";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: CenterRole;
      centerId: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: CenterRole;
    centerId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: CenterRole;
    centerId: string;
  }
}
