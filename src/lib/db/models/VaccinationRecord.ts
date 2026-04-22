// lib/db/models/VaccinationRecord.ts
// Core vaccination record — written by health workers after administering a dose.
// pendingSync=true means the record was created offline and not yet confirmed by server.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { VaccineType } from "@/lib/constants";

export type AdminSite = "left_arm" | "right_arm" | "left_thigh" | "right_thigh" | "oral";

export interface IVaccinationRecord extends Document {
  userId: mongoose.Types.ObjectId;       // citizen who received the vaccine
  centerId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;      // health worker who administered
  appointmentId?: mongoose.Types.ObjectId;
  vaccineType: VaccineType;
  doseNumber: number;                    // 1, 2, 3 …
  batchNo: string;                       // vaccine batch number
  lotNo: string;                         // lot/serial number on vial
  expiryDate: Date;                      // vial expiry date
  adminSite: AdminSite;                  // injection site
  adverseReaction?: string;             // any immediate reaction noted
  pendingSync: boolean;                  // offline-created record awaiting server confirmation
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VaccinationRecordSchema = new Schema<IVaccinationRecord>(
  {
    userId:          { type: Schema.Types.ObjectId, ref: "User", required: true },
    centerId:        { type: Schema.Types.ObjectId, ref: "Center", required: true },
    staffId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointmentId:   { type: Schema.Types.ObjectId, ref: "Appointment" },
    vaccineType:     { type: String, required: true },
    doseNumber:      { type: Number, required: true, min: 1 },
    batchNo:         { type: String, required: true, trim: true },
    lotNo:           { type: String, required: true, trim: true },
    expiryDate:      { type: Date, required: true },
    adminSite:       {
      type: String,
      enum: ["left_arm", "right_arm", "left_thigh", "right_thigh", "oral"],
      required: true,
    },
    adverseReaction: { type: String },
    pendingSync:     { type: Boolean, default: false },
    syncedAt:        { type: Date },
  },
  { timestamps: true, collection: "vaccinationrecords" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
VaccinationRecordSchema.index({ userId: 1, vaccineType: 1 });          // citizen's dose history
VaccinationRecordSchema.index({ centerId: 1, createdAt: -1 });         // center's daily log
VaccinationRecordSchema.index({ staffId: 1, createdAt: -1 });          // staff performance
VaccinationRecordSchema.index({ pendingSync: 1 });                     // offline sync sweep
VaccinationRecordSchema.index({ batchNo: 1 });                         // batch recall queries
// Compound: prevent duplicate dose entry for same citizen + vaccine + dose
VaccinationRecordSchema.index(
  { userId: 1, vaccineType: 1, doseNumber: 1 },
  { unique: true, partialFilterExpression: { pendingSync: false } }
);

export const VaccinationRecord: Model<IVaccinationRecord> =
  mongoose.models.VaccinationRecord ??
  mongoose.model<IVaccinationRecord>("VaccinationRecord", VaccinationRecordSchema);
