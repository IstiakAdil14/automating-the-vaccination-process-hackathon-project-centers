// lib/db/models/AuditLog.ts
// Immutable audit trail — every significant staff action is logged here.
// Documents are never updated or deleted (append-only).

import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "staff_login"
  | "staff_logout"
  | "staff_login_fail"
  | "session_expired"
  | "vaccination_recorded"
  | "inventory_receive"
  | "inventory_wastage"
  | "inventory_updated"       // legacy — kept for existing documents
  | "slot_configured"
  | "slot_blocked"
  | "queue_token_created"
  | "queue_next_called"
  | "queue_noshow"
  | "appointment_checked_in"
  | "appointment_noshow"
  | "fraud_alert_resolved"
  | "staff_request_submitted"
  | "restock_requested"
  | "setting_changed";

export type ResourceType =
  | "VaccinationRecord"
  | "Appointment"
  | "QueueToken"
  | "Inventory"
  | "FraudAlert"
  | "Slot"
  | "User";

export interface IAuditLog extends Document {
  centerId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>; // before/after values, extra context
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    centerId:     { type: Schema.Types.ObjectId, ref: "Center", required: true },
    staffId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    action:       { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId:   { type: Schema.Types.ObjectId },
    metadata:     { type: Schema.Types.Mixed, default: {} },
    ip:           { type: String },
    userAgent:    { type: String },
  },
  {
    // No updatedAt — audit logs are immutable
    timestamps: { createdAt: true, updatedAt: false },
    collection: "auditlogs",
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
AuditLogSchema.index({ centerId: 1, createdAt: -1 });   // center activity feed
AuditLogSchema.index({ staffId: 1, createdAt: -1 });    // per-staff audit trail
AuditLogSchema.index({ resourceType: 1, resourceId: 1 }); // resource history
AuditLogSchema.index({ action: 1, createdAt: -1 });     // action-type filtering

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ?? mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
