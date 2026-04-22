// lib/audit/logger.ts
// Fire-and-forget audit logger. Never awaited — never blocks the main operation.

import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/auth/getServerSession";

// ── Canonical action enum ─────────────────────────────────────────────────────
export const AuditAction = {
  LOGIN:               "staff_login",
  LOGOUT:              "staff_logout",
  LOGIN_FAIL:          "staff_login_fail",
  SESSION_EXPIRED:     "session_expired",
  VACCINATION_RECORD:  "vaccination_recorded",
  INVENTORY_RECEIVE:   "inventory_receive",
  INVENTORY_WASTAGE:   "inventory_wastage",
  SLOT_CONFIG:         "slot_configured",
  SLOT_BLOCK:          "slot_blocked",
  QUEUE_TOKEN:         "queue_token_created",
  QUEUE_NEXT:          "queue_next_called",
  QUEUE_NOSHOW:        "queue_noshow",
  APPOINTMENT_CHECKIN: "appointment_checked_in",
  APPOINTMENT_NOSHOW:  "appointment_noshow",
  FRAUD_RESOLVE:       "fraud_alert_resolved",
  STAFF_REQUEST:       "staff_request_submitted",
  RESTOCK_REQUEST:     "restock_requested",
  SETTING_CHANGE:      "setting_changed",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditContext {
  staffId:   string;
  centerId:  string;
  ip?:       string;
  userAgent?: string;
}

export interface AuditEntry {
  action:        AuditActionValue;
  resourceType:  string;
  resourceId?:   string;
  metadata?:     Record<string, unknown>;
  /** ISO string — set for offline-synced records so audit shows when action actually occurred */
  occurredAt?:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function extractRequestContext(req: NextRequest): Pick<AuditContext, "ip" | "userAgent"> {
  return {
    ip:        req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

export function buildContext(session: AuthSession, req: NextRequest): AuditContext {
  return { staffId: session.user.id, centerId: session.user.centerId, ...extractRequestContext(req) };
}

// ── Core logger ───────────────────────────────────────────────────────────────
export class AuditLogger {
  /**
   * Fire-and-forget. Never throws, never blocks the caller.
   * For offline-synced records pass `entry.occurredAt` (original offline ISO timestamp)
   * so the audit trail shows when the action actually happened vs when it was synced.
   */
  static log(ctx: AuditContext, entry: AuditEntry): void {
    AuditLogger._write(ctx, entry).catch(() => {
      // Silently swallow — audit failure must never break the main operation
    });
  }

  private static async _write(ctx: AuditContext, entry: AuditEntry): Promise<void> {
    const [{ connectDB }, { AuditLog }, { default: mongoose }] = await Promise.all([
      import("@/lib/db/mongoose"),
      import("@/lib/db/models/AuditLog"),
      import("mongoose"),
    ]);

    await connectDB();

    await AuditLog.create({
      centerId:     new mongoose.Types.ObjectId(ctx.centerId),
      staffId:      new mongoose.Types.ObjectId(ctx.staffId),
      action:       entry.action,
      resourceType: entry.resourceType,
      resourceId:   entry.resourceId ? new mongoose.Types.ObjectId(entry.resourceId) : undefined,
      metadata: {
        ...(entry.metadata ?? {}),
        ...(entry.occurredAt ? { _occurredAt: entry.occurredAt } : {}),
      },
      ip:        ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}

// ── withAudit — API route middleware wrapper ──────────────────────────────────
/**
 * Wraps any Next.js API route handler. On a 2xx response, fires an audit log
 * entry without blocking the response.
 *
 * Usage:
 *   export const POST = withAudit(handler, AuditAction.QUEUE_TOKEN, "QueueToken");
 *
 * Optional getMeta extracts extra metadata from the request body:
 *   withAudit(handler, AuditAction.SLOT_CONFIG, "SlotConfig",
 *     (_req, body) => ({ date: (body as { date: string }).date })
 *   )
 */
export function withAudit<TParams = unknown>(
  handler: (req: NextRequest, ctx: { params: TParams }) => Promise<Response>,
  action: AuditActionValue,
  resourceType: string,
  getMeta?: (req: NextRequest, body: unknown) => Record<string, unknown>
) {
  return async function auditedHandler(req: NextRequest, ctx: { params: TParams }): Promise<Response> {
    const cloned = req.clone();
    const response = await handler(req, ctx);

    if (response.ok) {
      try {
        const { auth } = await import("@/lib/auth/auth");
        const session = await auth();
        if (session?.user?.id && session.user.centerId) {
          const body = getMeta ? await cloned.json().catch(() => ({})) : {};
          AuditLogger.log(
            { staffId: session.user.id, centerId: session.user.centerId, ...extractRequestContext(req) },
            { action, resourceType, metadata: getMeta ? getMeta(req, body) : undefined }
          );
        }
      } catch {
        // Never block response
      }
    }

    return response;
  };
}
