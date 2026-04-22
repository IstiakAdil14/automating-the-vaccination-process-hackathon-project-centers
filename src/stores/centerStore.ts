import { create } from "zustand";
import type { StaffUser, Center } from "@/types";

interface CenterStore {
  staff: StaffUser | null;
  center: Center | null;
  setStaff: (staff: StaffUser) => void;
  setCenter: (center: Center) => void;
  clear: () => void;
}

export const useCenterStore = create<CenterStore>((set) => ({
  staff: null,
  center: null,
  setStaff: (staff) => set({ staff }),
  setCenter: (center) => set({ center }),
  clear: () => set({ staff: null, center: null }),
}));
