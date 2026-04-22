// lib/db/models/Inventory.ts
// Per-center vaccine stock. Each document = one batch of one vaccine type at one center.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { VaccineType } from "@/lib/constants";
import { INVENTORY_THRESHOLDS } from "@/lib/constants";

export interface IInventory extends Document {
  centerId: mongoose.Types.ObjectId;
  vaccineType: VaccineType;
  quantity: number;
  batchNo: string;
  lotNo?: string;
  expiryDate: Date;
  threshold: number;   // center-specific low-stock threshold (overrides global default)
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  isLowStock: boolean;
  isCritical: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
}

const InventorySchema = new Schema<IInventory>(
  {
    centerId:    { type: Schema.Types.ObjectId, ref: "Center", required: true },
    vaccineType: { type: String, required: true },
    quantity:    { type: Number, required: true, min: 0 },
    batchNo:     { type: String, required: true, trim: true },
    lotNo:       { type: String, trim: true },
    expiryDate:  { type: Date, required: true },
    threshold:   { type: Number, default: INVENTORY_THRESHOLDS.LOW_STOCK },
    receivedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "inventory" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
InventorySchema.index({ centerId: 1, vaccineType: 1 });          // stock lookup per center
InventorySchema.index({ centerId: 1, expiryDate: 1 });           // expiry sweep
InventorySchema.index({ expiryDate: 1 });                        // global expiry cron
InventorySchema.index({ centerId: 1, quantity: 1 });             // low-stock alerts

// ── Virtuals ──────────────────────────────────────────────────────────────────
InventorySchema.virtual("isLowStock").get(function (this: IInventory) {
  return this.quantity <= this.threshold;
});

InventorySchema.virtual("isCritical").get(function (this: IInventory) {
  return this.quantity <= INVENTORY_THRESHOLDS.CRITICAL_STOCK;
});

InventorySchema.virtual("isExpired").get(function (this: IInventory) {
  return this.expiryDate < new Date();
});

InventorySchema.virtual("daysUntilExpiry").get(function (this: IInventory) {
  const ms = this.expiryDate.getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
});

export const Inventory: Model<IInventory> =
  mongoose.models.Inventory ?? mongoose.model<IInventory>("Inventory", InventorySchema);
