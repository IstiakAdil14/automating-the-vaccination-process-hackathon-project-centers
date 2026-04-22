// hooks/useSlots.ts
import useSWR from "swr";
import type { SlotConfigDTO } from "@/types";

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((r) => r.data as SlotConfigDTO[]);

export function useSlots(month: string) {
  const { data, error, isLoading, mutate } = useSWR<SlotConfigDTO[]>(
    `/api/worker/slots?month=${month}`,
    fetcher
  );

  async function upsertSlot(
    payload: Omit<SlotConfigDTO, "id" | "booked" | "isBlocked" | "blockId" | "blockReason">
  ) {
    const res = await fetch("/api/worker/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        err.error?.formErrors?.[0] ?? err.error ?? "Save failed"
      );
    }
    await mutate();
  }

  async function blockDates(startDate: string, endDate: string, reason?: string) {
    const res = await fetch("/api/worker/slots/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Block failed");
    }
    await mutate();
    return (await res.json()).data as { blockId: string; dates: string[] };
  }

  async function unblockDates(blockId: string) {
    const res = await fetch(`/api/worker/slots/block/${blockId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Unblock failed");
    await mutate();
  }

  return {
    slots: data ?? [],
    isLoading,
    error,
    mutate,
    upsertSlot,
    blockDates,
    unblockDates,
  };
}
