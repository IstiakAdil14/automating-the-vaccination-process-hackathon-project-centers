// POST /api/worker/push/send
// Body: { title, body, tag?, url?, targetUserId? }
// Sends to all subscriptions for this center (or a specific user if targetUserId provided).
// Automatically removes expired/invalid subscriptions (410 Gone).
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, PushSubscription } from "@/lib/db";
import { sendPushNotification, type PushPayload } from "@/lib/push/vapid";
import mongoose from "mongoose";
import { z } from "zod";

const schema = z.object({
  title:        z.string().min(1).max(100),
  body:         z.string().min(1).max(300),
  tag:          z.string().optional(),
  url:          z.string().optional(),
  targetUserId: z.string().optional(),
  requireInteraction: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const filter: Record<string, unknown> = { centerId };
  if (parsed.data.targetUserId && mongoose.isValidObjectId(parsed.data.targetUserId)) {
    filter.userId = new mongoose.Types.ObjectId(parsed.data.targetUserId);
  }

  const subscriptions = await PushSubscription.find(filter).lean();
  if (subscriptions.length === 0) {
    return NextResponse.json({ message: "No subscriptions found", sent: 0 });
  }

  const payload: PushPayload = {
    title:              parsed.data.title,
    body:               parsed.data.body,
    tag:                parsed.data.tag,
    url:                parsed.data.url ?? "/worker/dashboard",
    icon:               "/icons/icon-192.png",
    badge:              "/icons/icon-96.png",
    requireInteraction: parsed.data.requireInteraction ?? false,
  };

  let sent = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, expirationTime: sub.expirationTime, keys: sub.keys },
        payload
      );
      if (result.success) {
        sent++;
      } else if (result.error?.includes("410") || result.error?.includes("404")) {
        // Subscription expired — queue for deletion
        expiredEndpoints.push(sub.endpoint);
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: expiredEndpoints } });
  }

  return NextResponse.json({
    message: `Push sent to ${sent} device${sent !== 1 ? "s" : ""}`,
    sent,
    expired: expiredEndpoints.length,
  });
}
