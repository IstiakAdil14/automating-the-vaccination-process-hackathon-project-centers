// lib/db/models/FraudAlert.ts
// Fraud alerts — written by centers app, read by admin app for investigation.
// context stores arbitrary JSON evidence (e.g. duplicate record IDs, QR hash mismatch).

import mongoose, { Schema, Document, Model } from "mongoose";
import type { FraudAlertType, FraudSeverity } from "@/lib/constants";

export interface IFraudAlert extends Document {
  centerId: mongoose.Types.ObjectId;
  type: FraudAlertType;
  staffId?: mongoose.Types.ObjectId;   // staff who triggered or is implicated
  patientNid?: string;                 // NID of the patient involved
  severity: FraudSeverity;
  status: "open" | "investigating" | "resolved" | "dismissed";
  context: Record<string, unknown>;    // flexible evidence payload
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FraudAlertSchema = new Schema<IFraudAlert>(
  {
    centerId:   { type: Schema.Types.ObjectId, ref: "Center", required: true },
    type:       {
      type: String,
      enum: ["duplicate_record", "qr_tamper", "excess_doses", "identity_mismatch", "suspicious_volume"],
      required: true,
    },
    staffId:    { type: Schema.Types.ObjectId, ref: "User" },
    patientNid: { type: String },
    severity:   { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    status:     { type: String, enum: ["open", "investigating", "resolved", "dismissed"], default: "open" },
    context:    { type: Schema.Types.Mixed, default: {} },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true, collection: "fraudalerts" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
FraudAlertSchema.index({ centerId: 1, status: 1 });
FraudAlertSchema.index({ severity: 1, status: 1 });   // admin triage view
FraudAlertSchema.index({ createdAt: -1 });             // latest-first feed
FraudAlertSchema.index({ patientNid: 1 });             // patient-level investigation

export const FraudAlert: Model<IFraudAlert> =
  mongoose.models.FraudAlert ?? mongoose.model<IFraudAlert>("FraudAlert", FraudAlertSchema);
