// stores — Zustand global state stores
import { create } from "zustand";
import type { QueueEntry } from "@/types";

interface QueueStore {
  queue: QueueEntry[];
  setQueue: (queue: QueueEntry[]) => void;
  updateStatus: (id: string, status: QueueEntry["status"]) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  queue: [],
  setQueue: (queue) => set({ queue }),
  updateStatus: (id, status) =>
    set((state) => ({
      queue: state.queue.map((entry) => (entry._id === id ? { ...entry, status } : entry)),
    })),
}));
