// GET /api/worker/queue/stream — SSE real-time queue state
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken } from "@/lib/db";

export const dynamic = "force-dynamic";

// centerId → Set of SSE controllers
const subscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

export function broadcastQueueUpdate(centerId: string) {
  const subs = subscribers.get(centerId);
  if (!subs?.size) return;
  const msg = new TextEncoder().encode(`data: refresh\n\n`);
  subs.forEach((ctrl) => { try { ctrl.enqueue(msg); } catch { /* closed */ } });
}

export async function buildSnapshot(centerId: string, today: string) {
  const [serving, waiting, waitingCount, doneCount, allTokens] = await Promise.all([
    QueueToken.findOne({ centerId, date: today, status: { $in: ["called", "in_progress"] } })
      .sort({ calledAt: -1 }).select("tokenNumber patientInfo vaccineType status calledAt missedCalls").lean(),
    QueueToken.find({ centerId, date: today, status: "waiting" })
      .sort({ tokenNumber: 1 }).limit(5)
      .select("tokenNumber patientInfo vaccineType status appointmentId missedCalls").lean(),
    QueueToken.countDocuments({ centerId, date: today, status: "waiting" }),
    QueueToken.countDocuments({ centerId, date: today, status: "done" }),
    QueueToken.find({ centerId, date: today })
      .sort({ tokenNumber: 1 })
      .select("tokenNumber patientInfo vaccineType status calledAt completedAt createdAt appointmentId missedCalls").lean(),
  ]);

  return {
    serving: serving ? {
      id: String(serving._id),
      tokenNumber: serving.tokenNumber,
      patientName: serving.patientInfo.name,
      vaccineType: serving.vaccineType,
      status: serving.status,
      calledAt: serving.calledAt,
      missedCalls: (serving as any).missedCalls ?? 0,
    } : null,
    next5: waiting.map((t) => ({
      id: String(t._id),
      tokenNumber: t.tokenNumber,
      patientName: t.patientInfo.name,
      vaccineType: t.vaccineType,
      isAppointment: !!(t as any).appointmentId,
      missedCalls: (t as any).missedCalls ?? 0,
    })),
    waitingCount,
    doneCount,
    allTokens: allTokens.map((t) => ({
      id: String(t._id),
      tokenNumber: t.tokenNumber,
      patientName: t.patientInfo.name,
      patientPhone: t.patientInfo.phone,
      vaccineType: t.vaccineType,
      status: t.status,
      calledAt: (t as any).calledAt ?? null,
      completedAt: (t as any).completedAt ?? null,
      createdAt: t.createdAt,
      isAppointment: !!(t as any).appointmentId,
      missedCalls: (t as any).missedCalls ?? 0,
    })),
  };
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return new Response("Unauthorized", { status: 401 });

  const centerId = String(session.user.centerId);
  const today = new Date().toISOString().slice(0, 10);
  await connectDB();
  const snapshot = await buildSnapshot(centerId, today);

  const encoder = new TextEncoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      if (!subscribers.has(centerId)) subscribers.set(centerId, new Set());
      subscribers.get(centerId)!.add(c);
      c.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
    },
    cancel() {
      subscribers.get(centerId)?.delete(ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
