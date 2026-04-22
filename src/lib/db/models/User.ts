// lib/db/models/User.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "staff" | "supervisor" | "admin" | "citizen";
  centerId?: mongoose.Types.ObjectId;
  phone?: string;
  nid?: string;
  dob?: Date;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  displayName: string;
}

const UserSchema = new Schema<IUser>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, select: false },
    role:      { type: String, enum: ["staff", "supervisor", "admin", "citizen"], required: true },
    centerId:  { type: Schema.Types.ObjectId, ref: "Center" },
    phone:     { type: String, trim: true },
    nid:       { type: String, trim: true },
    dob:       { type: Date },
    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true, collection: "users" }
);

// email index is created by unique:true above — no duplicate needed
UserSchema.index({ centerId: 1, role: 1 });
UserSchema.index({ role: 1, isActive: 1 });

UserSchema.virtual("displayName").get(function (this: IUser) {
  return this.name;
});

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
