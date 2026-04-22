// POST /api/worker/push/subscribe
// Body: { subscription: PushSubscriptionJSON }
// Upserts the subscription by endpoint — handles re-subscribe after expiry.
import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/getServerSession";
import { connectDB, PushSubscription } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/push/vapid";
import mongoose from "mongoose";
import { z } from "zod";

const schema = z.object({
  subscription: z.object({
    endpoint:       z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth:   z.string().min(1),
    }),
  }),
});

// GET — return the VAPID public key so the client can subscribe
export async function GET() {
  try {
    return NextResponse.json({ vapidPublicKey: getVapidPublicKey() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "VAPID not configured" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectDB();

  const { subscription } = parsed.data;

  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId:         new mongoose.Types.ObjectId(session.user.id),
      centerId:       new mongoose.Types.ObjectId(session.user.centerId),
      endpoint:       subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys:           subscription.keys,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ message: "Subscribed to push notifications" }, { status: 201 });
}

// DELETE — unsubscribe
export async function DELETE(req: NextRequest) {
  let session;
  try { session = await requireApiSession(); }
  catch (e) { return e as Response; }

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  await connectDB();
  await PushSubscription.deleteOne({
    endpoint,
    userId: new mongoose.Types.ObjectId(session.user.id),
  });

  return NextResponse.json({ message: "Unsubscribed" });
}
