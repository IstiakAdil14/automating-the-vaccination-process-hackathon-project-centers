// lib/db/models/PushSubscription.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscription extends Document {
  userId:         mongoose.Types.ObjectId;
  centerId:       mongoose.Types.ObjectId;
  endpoint:       string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth:   string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: "User",   required: true },
    centerId:       { type: Schema.Types.ObjectId, ref: "Center", required: true },
    endpoint:       { type: String, required: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },
  },
  { timestamps: true, collection: "pushsubscriptions" }
);

// One subscription per endpoint — upsert on re-subscribe
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ userId: 1 });
PushSubscriptionSchema.index({ centerId: 1 });

export const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ??
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
