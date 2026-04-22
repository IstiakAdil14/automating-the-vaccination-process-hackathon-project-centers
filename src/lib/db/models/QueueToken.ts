// lib/db/models/QueueToken.ts
// Daily queue tokens — one document per patient per day at a center.
// tokenNumber resets to 1 each day per center.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { VaccineType, QueueStatus } from "@/lib/constants";

export interface IPatientInfo {
  name: string;
  phone: string;
  age?: number;
  nid?: string;
}

export interface IQueueToken extends Document {
  centerId: mongoose.Types.ObjectId;
  date: string;                          // "YYYY-MM-DD" — for daily reset
  tokenNumber: number;
  patientInfo: IPatientInfo;
  appointmentId?: mongoose.Types.ObjectId; // null for walk-ins
  vaccineType: VaccineType;
  status: QueueStatus;
  calledAt?: Date;                       // when token was called
  completedAt?: Date;
  staffId?: mongoose.Types.ObjectId;    // staff who served this patient
  missedCalls: number;                   // times skipped without responding
  createdAt: Date;
  updatedAt: Date;
  // Virtual
  waitPosition: number;
}

const PatientInfoSchema = new Schema<IPatientInfo>(
  {
    name:  { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    age:   { type: Number },
    nid:   { type: String },
  },
  { _id: false }
);

const QueueTokenSchema = new Schema<IQueueToken>(
  {
    centerId:      { type: Schema.Types.ObjectId, ref: "Center", required: true },
    date:          { type: String, required: true },
    tokenNumber:   { type: Number, required: true },
    patientInfo:   { type: PatientInfoSchema, required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    vaccineType:   { type: String, required: true },
    status:        {
      type: String,
      enum: ["waiting", "called", "in_progress", "done", "skipped", "deferred"],
      default: "waiting",
    },
    calledAt:      { type: Date },
    completedAt:   { type: Date },
    staffId:       { type: Schema.Types.ObjectId, ref: "User" },
    missedCalls:   { type: Number, default: 0 },
  },
  { timestamps: true, collection: "queuetokens" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
QueueTokenSchema.index({ centerId: 1, date: 1 });                    // today's queue
QueueTokenSchema.index({ centerId: 1, date: 1, status: 1 });         // filter by status
QueueTokenSchema.index({ centerId: 1, date: 1, tokenNumber: 1 }, { unique: true }); // no duplicate tokens
QueueTokenSchema.index({ appointmentId: 1 });                        // link to appointment

export const QueueToken: Model<IQueueToken> =
  mongoose.models.QueueToken ?? mongoose.model<IQueueToken>("QueueToken", QueueTokenSchema);
