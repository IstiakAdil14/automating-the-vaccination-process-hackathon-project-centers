// hooks — custom React hooks
"use client";
import { useEffect } from "react";
import { useQueueStore } from "@/stores/queueStore";
import type { QueueEntry } from "@/types";

export function useQueue() {
  const { queue, setQueue } = useQueueStore();

  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((data: { queue: QueueEntry[] }) => setQueue(data.queue))
      .catch(console.error);
  }, [setQueue]);

  return queue;
}
