// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;

// Ensure this route is always dynamic (never statically cached)
export const dynamic = "force-dynamic";
