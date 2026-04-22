import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDaySchedule {
  open: boolean;
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
}

export interface ICenterApplication extends Document {
  referenceNumber: string;
  // Step 1
  centerName: string;
  licenseNumber: string;
  centerType: string;
  establishedYear: number;
  // Step 2
  division: string;
  district: string;
  localBodyType: "Upazila" | "City Corporation" | "Pourashava";
  upazila: string;
  address: string;
  geoLat?: number;
  geoLng?: number;
  // Step 3
  contactName: string;
  designation: string;
  phone: string;
  email: string;
  // Step 4
  schedule: Record<string, IDaySchedule>;
  // Step 5
  facilityLicenseUrl: string;
  centerPhotoUrl: string;
  officerNidUrl: string;
  // Meta
  status: "pending_review" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const DayScheduleSchema = new Schema<IDaySchedule>(
  {
    open: { type: Boolean, default: false },
    morningStart: { type: String, default: "08:00" },
    morningEnd: { type: String, default: "12:00" },
    eveningStart: { type: String, default: "14:00" },
    eveningEnd: { type: String, default: "18:00" },
  },
  { _id: false }
);

const CenterApplicationSchema = new Schema<ICenterApplication>(
  {
    referenceNumber: { type: String, required: true, unique: true },
    centerName: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    centerType: { type: String, required: true },
    establishedYear: { type: Number, required: true },
    division: { type: String, required: true },
    district: { type: String, required: true },
    localBodyType: { type: String, enum: ["Upazila", "City Corporation", "Pourashava"], required: true },
    upazila: { type: String, required: false },
    address: { type: String, required: true },
    geoLat: { type: Number, required: false },
    geoLng: { type: Number, required: false },
    contactName: { type: String, required: true },
    designation: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    schedule: { type: Map, of: DayScheduleSchema, required: false },
    facilityLicenseUrl: { type: String, required: true },
    centerPhotoUrl: { type: String, required: true },
    officerNidUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
  },
  { timestamps: true, collection: "center_applications" }
);

export const CenterApplication: Model<ICenterApplication> =
  mongoose.models.CenterApplication ??
  mongoose.model<ICenterApplication>("CenterApplication", CenterApplicationSchema);
