// lib/db/models/StaffRequest.ts
// Requests raised by center staff/supervisors to the admin — e.g. restock, extra staff, equipment.

import mongoose, { Schema, Document, Model } from "mongoose";

export type RequestType =
  | "restock"          // vaccine/supply restock
  | "extra_staff"      // request additional health workers
  | "equipment"        // medical equipment request
  | "maintenance"      // center maintenance
  | "schedule_change"  // shift/slot schedule change
  | "other";

export type RequestUrgency = "low" | "normal" | "high" | "critical";

export interface IStaffRequest extends Document {
  centerId: mongoose.Types.ObjectId;
  requestType: RequestType;
  reason: string;
  urgency: RequestUrgency;
  status: "pending" | "approved" | "rejected" | "in_progress" | "completed";
  requestedBy: mongoose.Types.ObjectId; // staff/supervisor who raised it
  reviewedBy?: mongoose.Types.ObjectId; // admin who actioned it
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaffRequestSchema = new Schema<IStaffRequest>(
  {
    centerId:    { type: Schema.Types.ObjectId, ref: "Center", required: true },
    requestType: {
      type: String,
      enum: ["restock", "extra_staff", "equipment", "maintenance", "schedule_change", "other"],
      required: true,
    },
    reason:      { type: String, required: true, trim: true },
    urgency:     { type: String, enum: ["low", "normal", "high", "critical"], default: "normal" },
    status:      {
      type: String,
      enum: ["pending", "approved", "rejected", "in_progress", "completed"],
      default: "pending",
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote:  { type: String },
    reviewedAt:  { type: Date },
  },
  { timestamps: true, collection: "staffrequests" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
StaffRequestSchema.index({ centerId: 1, status: 1 });
StaffRequestSchema.index({ status: 1, urgency: 1 });   // admin triage queue
StaffRequestSchema.index({ requestedBy: 1, createdAt: -1 });

export const StaffRequest: Model<IStaffRequest> =
  mongoose.models.StaffRequest ?? mongoose.model<IStaffRequest>("StaffRequest", StaffRequestSchema);
