// lib/db/models/ShiftAssignment.ts
// Weekly shift assignments for staff at a center.
// Each document = one staff member's shift on one specific date.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { ShiftType } from "@/lib/constants";

export interface IShiftAssignment extends Document {
  centerId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  shift: ShiftType;
  assignedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    centerId:   { type: Schema.Types.ObjectId, ref: "Center", required: true },
    staffId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    date:       { type: String, required: true }, // "YYYY-MM-DD"
    shift:      { type: String, enum: ["morning", "afternoon", "night"], required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "shiftassignments" }
);

ShiftAssignmentSchema.index({ centerId: 1, date: 1 });
ShiftAssignmentSchema.index({ staffId: 1, date: 1 });
// Unique: one staff can only have one of each shift type per day
ShiftAssignmentSchema.index({ staffId: 1, date: 1, shift: 1 }, { unique: true });

export const ShiftAssignment: Model<IShiftAssignment> =
  mongoose.models.ShiftAssignment ??
  mongoose.model<IShiftAssignment>("ShiftAssignment", ShiftAssignmentSchema);
