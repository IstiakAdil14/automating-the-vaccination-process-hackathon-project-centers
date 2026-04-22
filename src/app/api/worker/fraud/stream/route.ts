// app/api/worker/fraud/stream/route.ts
// SSE stream for center fraud alerts.
// New alerts written via alertWriter.ts are pushed immediately via registerSseClient.

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, FraudAlert } from "@/lib/db";
import { registerSseClient } from "@/lib/fraud/alertWriter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return new Response("Unauthorized", { status: 401 });

  const centerId = session.user.centerId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: string) => {
        if (!closed) controller.enqueue(encoder.encode(data));
      };

      // Register for real-time pushes from alertWriter
      const unregister = registerSseClient(centerId, send);

      // Send initial batch of open alerts
      try {
        await connectDB();
        const initial = await FraudAlert.find({ centerId, status: "open" })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        send(
          `data: ${JSON.stringify({
            type: "initial",
            alerts: initial.map((a) => ({
              id: String(a._id),
              type: a.type,
              severity: a.severity,
              patientNid: a.patientNid ?? null,
              context: a.context,
              createdAt: a.createdAt.toISOString(),
            })),
          })}\n\n`
        );
      } catch {
        send(`data: ${JSON.stringify({ type: "error", message: "Failed to load alerts" })}\n\n`);
      }

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        send(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unregister();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
