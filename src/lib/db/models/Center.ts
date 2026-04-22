// lib/db/models/Center.ts
// Vaccination centers — shared with admin app (read-only from centers portal).

import mongoose, { Schema, Document, Model } from "mongoose";
import type { VaccineType } from "@/lib/constants";

export interface IOperatingHours {
  open: string;   // "08:00"
  close: string;  // "17:00"
  days: number[]; // 0=Sun … 6=Sat
}

export interface IDaySchedule {
  open: string;   // "08:00"
  close: string;  // "17:00"
  closed: boolean;
}

export interface IHoursOverride {
  date: string;   // "YYYY-MM-DD"
  open: string;
  close: string;
  closed: boolean;
  note?: string;
}

export interface INotificationPrefs {
  newBooking: boolean;
  cancellation: boolean;
  lowStock: boolean;
  fraud: boolean;
  shiftReminder: boolean;
}

export interface ICenter extends Document {
  name: string;
  email?: string;
  address: string;
  division: string;
  district: string;
  geoLat: number;
  geoLng: number;
  capacity: number;
  vaccines: VaccineType[];
  operatingHours: IOperatingHours;
  // Extended schedule: per-day open/close + overrides
  weekSchedule?: IDaySchedule[];   // index 0=Sun…6=Sat
  hoursOverrides?: IHoursOverride[];
  notificationPrefs?: INotificationPrefs;
  photoUrl?: string;
  status: "active" | "suspended" | "closed";
  managerId?: mongoose.Types.ObjectId;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  isOpen: boolean;
}

const OperatingHoursSchema = new Schema<IOperatingHours>(
  {
    open:  { type: String, required: true, default: "08:00" },
    close: { type: String, required: true, default: "17:00" },
    days:  { type: [Number], default: [0, 1, 2, 3, 4, 5] }, // Sun–Fri
  },
  { _id: false }
);

const CenterSchema = new Schema<ICenter>(
  {
    name:           { type: String, required: true, trim: true },
    address:        { type: String, required: true },
    division:       { type: String, required: true },
    district:       { type: String, required: true },
    geoLat:         { type: Number, required: true },
    geoLng:         { type: Number, required: true },
    capacity:       { type: Number, required: true, min: 1 },
    vaccines:       { type: [String], required: true },
    operatingHours: { type: OperatingHoursSchema, default: () => ({}) },
    status:         { type: String, enum: ["active", "suspended", "closed"], default: "active" },
    managerId:      { type: Schema.Types.ObjectId, ref: "User" },
    phone:          { type: String },
    email:          { type: String },
    photoUrl:       { type: String },
    weekSchedule:   {
      type: [{
        open:   { type: String, default: "08:00" },
        close:  { type: String, default: "17:00" },
        closed: { type: Boolean, default: false },
      }],
      default: undefined,
    },
    hoursOverrides: {
      type: [{
        date:   { type: String, required: true },
        open:   { type: String, default: "08:00" },
        close:  { type: String, default: "17:00" },
        closed: { type: Boolean, default: false },
        note:   { type: String },
      }],
      default: [],
    },
    notificationPrefs: {
      type: {
        newBooking:    { type: Boolean, default: true },
        cancellation:  { type: Boolean, default: true },
        lowStock:      { type: Boolean, default: true },
        fraud:         { type: Boolean, default: true },
        shiftReminder: { type: Boolean, default: false },
      },
      default: () => ({ newBooking: true, cancellation: true, lowStock: true, fraud: true, shiftReminder: false }),
    },
  },
  { timestamps: true, collection: "centers" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
CenterSchema.index({ status: 1 });
CenterSchema.index({ division: 1, district: 1 });
CenterSchema.index({ geoLat: 1, geoLng: 1 }); // geo proximity queries

// ── Virtual: isOpen ───────────────────────────────────────────────────────────
CenterSchema.virtual("isOpen").get(function (this: ICenter) {
  if (this.status !== "active") return false;
  const now = new Date();
  const day = now.getDay();
  if (!this.operatingHours.days.includes(day)) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= this.operatingHours.open && hhmm < this.operatingHours.close;
});

export const Center: Model<ICenter> =
  mongoose.models.Center ?? mongoose.model<ICenter>("Center", CenterSchema);
