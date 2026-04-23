import mongoose, { Schema, Document, Model } from "mongoose";

interface IAddress {
  division: string;
  district: string;
  upazila:  string;
  full:     string;
}

interface IContact {
  name:   string;
  phone:  string;
  email?: string;
}

interface IOperatingHour {
  day:           number;
  morningStart?: string;
  morningEnd?:   string;
  eveningStart?: string;
  eveningEnd?:   string;
}

export interface ICenter extends Document {
  centerId:          string;
  name:              string;
  licenseNo:         string;
  type:              string;
  geoLat:            number;
  geoLng:            number;
  address:           IAddress;
  contact:           IContact;
  operatingHours:    IOperatingHour[];
  status:            "PENDING" | "ACTIVE" | "SUSPENDED";
  dailyCapacity:     number;
  approvedAt?:       Date;
  suspendedReason?:  string;
  totalVaccinations: number;
  hashedPassword?:   string;
  createdAt:         Date;
  updatedAt:         Date;
}

const OperatingHourSchema = new Schema<IOperatingHour>(
  {
    day:          { type: Number, required: true },
    morningStart: { type: String },
    morningEnd:   { type: String },
    eveningStart: { type: String },
    eveningEnd:   { type: String },
  },
  { _id: false }
);

const CenterSchema = new Schema<ICenter>(
  {
    centerId:  { type: String, required: true, unique: true },
    name:      { type: String, required: true, trim: true },
    licenseNo: { type: String, required: true, unique: true },
    type:      { type: String, required: true },
    geoLat:    { type: Number, default: 0 },
    geoLng:    { type: Number, default: 0 },
    address: {
      division: { type: String, required: true },
      district: { type: String, required: true },
      upazila:  { type: String, default: "" },
      full:     { type: String, required: true },
    },
    contact: {
      name:  { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, lowercase: true },
    },
    hashedPassword:    { type: String },
    operatingHours:    { type: [OperatingHourSchema], default: [] },
    status:            { type: String, enum: ["PENDING", "ACTIVE", "SUSPENDED"], default: "PENDING" },
    dailyCapacity:     { type: Number, default: 100 },
    approvedAt:        { type: Date },
    suspendedReason:   { type: String },
    totalVaccinations: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "centers" }
);

CenterSchema.index({ status: 1 });
CenterSchema.index({ "address.division": 1, "address.district": 1 });
CenterSchema.index({ geoLat: 1, geoLng: 1 });

export const Center: Model<ICenter> =
  mongoose.models.Center ?? mongoose.model<ICenter>("Center", CenterSchema);
