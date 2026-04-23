// Mirrors the admin app's Staff model — same collection, same schema shape.
// Only the fields needed for authentication are included.
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IStaff extends Document {
  staffId: string;
  name: string;
  email: string;
  hashedPassword: string;
  role: "VACCINATOR" | "RECEPTIONIST" | "SUPERVISOR";
  centerId: Types.ObjectId;
  isActive: boolean;
  isSuspended: boolean;
  lastActive?: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    staffId:        { type: String, required: true },
    name:           { type: String, required: true },
    email:          { type: String, required: true, lowercase: true },
    hashedPassword: { type: String, required: true, select: false },
    role:           { type: String, enum: ["VACCINATOR", "RECEPTIONIST", "SUPERVISOR"], required: true },
    centerId:       { type: Schema.Types.ObjectId, ref: "Center", required: true },
    isActive:       { type: Boolean, default: true },
    isSuspended:    { type: Boolean, default: false },
    lastActive:     { type: Date },
  },
  { timestamps: true, collection: "staff" }
);

export const Staff: Model<IStaff> =
  mongoose.models.Staff ?? mongoose.model<IStaff>("Staff", StaffSchema);
