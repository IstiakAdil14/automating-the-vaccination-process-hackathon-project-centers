// lib/validators — Zod schemas for API input validation
import { z } from "zod";
import { VACCINE_TYPES } from "@/lib/constants";

const DOSE_NUMBERS = [1, 2, 3, 4] as const;

export const vaccinationRecordSchema = z.object({
  userId: z.string().min(1),
  vaccineType: z.enum(VACCINE_TYPES),
  dose: z.number().refine((d) => (DOSE_NUMBERS as readonly number[]).includes(d), { message: "Invalid dose number" }),
  notes: z.string().optional(),
});

export const queueEntrySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(11).max(14),
  vaccineType: z.enum(VACCINE_TYPES),
  isWalkIn: z.boolean().default(true),
});

export const slotConfigSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capacity: z.number().min(1).max(500),
  vaccineType: z.enum(VACCINE_TYPES),
});

export type VaccinationRecordInput = z.infer<typeof vaccinationRecordSchema>;
export type QueueEntryInput = z.infer<typeof queueEntrySchema>;
export type SlotConfigInput = z.infer<typeof slotConfigSchema>;
