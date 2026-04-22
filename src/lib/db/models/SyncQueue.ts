// lib/db/models/SyncQueue.ts
// Offline sync queue — records created while the center is offline are stored here
// and flushed to their target collections once connectivity is restored.
// A background cron job sweeps pending entries and retries failed ones.

import mongoose, { Schema, Document, Model } from "mongoose";

export type SyncRecordType =
  | "VaccinationRecord"
  | "QueueToken"
  | "Appointment";

export interface ISyncQueue extends Document {
  recordType: SyncRecordType;
  payload: Record<string, unknown>; // the full document to be inserted/updated
  status: "pending" | "processing" | "synced" | "failed";
  attempts: number;                 // number of sync attempts made
  lastAttemptAt?: Date;
  error?: string;                   // last error message if failed
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SyncQueueSchema = new Schema<ISyncQueue>(
  {
    recordType:    {
      type: String,
      enum: ["VaccinationRecord", "QueueToken", "Appointment"],
      required: true,
    },
    payload:       { type: Schema.Types.Mixed, required: true },
    status:        {
      type: String,
      enum: ["pending", "processing", "synced", "failed"],
      default: "pending",
    },
    attempts:      { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    error:         { type: String },
    syncedAt:      { type: Date },
  },
  { timestamps: true, collection: "syncqueue" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
SyncQueueSchema.index({ status: 1, attempts: 1 });   // cron sweep: pending with low attempts first
SyncQueueSchema.index({ createdAt: 1 });             // FIFO processing order
SyncQueueSchema.index({ status: 1, createdAt: 1 });  // pending queue ordered by age

export const SyncQueue: Model<ISyncQueue> =
  mongoose.models.SyncQueue ?? mongoose.model<ISyncQueue>("SyncQueue", SyncQueueSchema);
