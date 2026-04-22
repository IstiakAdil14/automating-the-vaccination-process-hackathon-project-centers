// lib/db/models/SlotConfig.ts
// Per-day slot configuration for a vaccination center.
// One document per (centerId, date) pair — upserted by center_manager.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { VaccineType } from "@/lib/constants";

export interface IVaccineAllocation {
  vaccineType: VaccineType;
  quota: number;
}

export interface ISlotConfig extends Document {
  centerId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  totalCapacity: number;
  morningLimit: number;
  eveningLimit: number;
  walkinQuota: number;
  vaccineAllocations: IVaccineAllocation[];
  isBlocked: boolean;
  blockReason?: string;
  blockId?: string; // groups dates blocked together in one operation
  createdAt: Date;
  updatedAt: Date;
}

const VaccineAllocationSchema = new Schema<IVaccineAllocation>(
  {
    vaccineType: { type: String, required: true },
    quota: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SlotConfigSchema = new Schema<ISlotConfig>(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    date: { type: String, required: true },
    totalCapacity: { type: Number, required: true, min: 1 },
    morningLimit: { type: Number, required: true, min: 0 },
    eveningLimit: { type: Number, required: true, min: 0 },
    walkinQuota: { type: Number, required: true, min: 0, default: 0 },
    vaccineAllocations: { type: [VaccineAllocationSchema], default: [] },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String },
    blockId: { type: String },
  },
  { timestamps: true, collection: "slot_configs" }
);

SlotConfigSchema.index({ centerId: 1, date: 1 }, { unique: true });
SlotConfigSchema.index({ centerId: 1, isBlocked: 1 });

export const SlotConfig: Model<ISlotConfig> =
  mongoose.models.SlotConfig ??
  mongoose.model<ISlotConfig>("SlotConfig", SlotConfigSchema);
