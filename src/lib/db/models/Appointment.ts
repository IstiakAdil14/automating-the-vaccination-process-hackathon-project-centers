// lib/db/models/Appointment.ts
// Appointments — shared collection. Centers app checks in citizens and marks completion.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { VaccineType, AppointmentStatus } from "@/lib/constants";

export interface IAppointment extends Document {
  userId: mongoose.Types.ObjectId;
  centerId: mongoose.Types.ObjectId;
  slotId?: mongoose.Types.ObjectId;   // null for walk-ins
  vaccineType: VaccineType;
  date: string;                        // "YYYY-MM-DD"
  timeSlot: string;                    // "09:00-09:30"
  status: AppointmentStatus;
  checkedIn: boolean;                  // staff marked patient as arrived
  checkedInAt?: Date;
  walkin: boolean;                     // true = no prior booking
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual
  isToday: boolean;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    centerId:    { type: Schema.Types.ObjectId, ref: "Center", required: true },
    slotId:      { type: Schema.Types.ObjectId, ref: "Slot" },
    vaccineType: { type: String, required: true },
    date:        { type: String, required: true },   // stored as "YYYY-MM-DD" for easy querying
    timeSlot:    { type: String, required: true },
    status:      {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no_show", "rescheduled"],
      default: "pending",
    },
    checkedIn:   { type: Boolean, default: false },
    checkedInAt: { type: Date },
    walkin:      { type: Boolean, default: false },
    notes:       { type: String },
  },
  { timestamps: true, collection: "appointments" }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
AppointmentSchema.index({ centerId: 1, date: 1 });           // daily schedule view
AppointmentSchema.index({ centerId: 1, date: 1, status: 1 }); // filter by status per day
AppointmentSchema.index({ userId: 1, status: 1 });            // citizen's appointments
AppointmentSchema.index({ centerId: 1, checkedIn: 1 });       // check-in queue

// ── Virtual: isToday ──────────────────────────────────────────────────────────
AppointmentSchema.virtual("isToday").get(function (this: IAppointment) {
  const today = new Date().toISOString().slice(0, 10);
  return this.date === today;
});

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ?? mongoose.model<IAppointment>("Appointment", AppointmentSchema);
