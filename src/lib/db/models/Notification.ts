// lib/db/models/Notification.ts
// Shared Notifications collection. Centers app writes side-effect reminders;
// citizen app reads them. Matches the schema described in the system README.

import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  message: string;
  read: boolean;
  scheduledAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:        { type: String, required: true },
    message:     { type: String, required: true },
    read:        { type: Boolean, default: false },
    scheduledAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "notifications" }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ scheduledAt: 1 });

const NotificationModel: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>("Notification", NotificationSchema);

export default NotificationModel;
