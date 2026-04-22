"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { addToQueue } from "@/lib/offline/offlineQueue";
import { OFFLINE_STORE_NAMES } from "@/lib/constants";
import { VACCINE_MAX_DOSES } from "@/lib/constants";
import type { VaccineType } from "@/lib/constants";

export interface PatientHistory {
  id: string;
  vaccineType: string;
  doseNumber: number;
  batchNo: string;
  adminSite: string;
  date: string;
  centerId: string;
}

export interface PatientData {
  id: string;
  name: string;
  nid: string | null;
  dob: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface InventoryBatch {
  id: string;
  vaccineType: string;
  batchNo: string;
  lotNo: string;
  expiryDate: string;
  quantity: number;
}

export type LookupMethod = "qr" | "nid" | "booking";

const schema = z.object({
  vaccineType: z.string().min(1, "Select a vaccine"),
  doseNumber: z.coerce.number().min(1),
  inventoryId: z.string().min(1, "Select a batch"),
  adminSite: z.enum(["left_arm", "right_arm", "left_thigh", "right_thigh"], {
    required_error: "Select administration site",
  }),
  adverseReaction: z.string().optional(),
});

export type VaccinationFormValues = z.infer<typeof schema>;

export function useRecordVaccination(
  centerId: string,
  staffId: string,
  inventoryBatches: InventoryBatch[],
  centerVaccines: string[]
) {
  const [lookupMethod, setLookupMethod] = useState<LookupMethod>("nid");
  const [lookupInput, setLookupInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [history, setHistory] = useState<PatientHistory[]>([]);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [vaccineTypeHint, setVaccineTypeHint] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationBlocks, setValidationBlocks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastQrRef = useRef<string>("");

  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { doseNumber: 1, adverseReaction: "" },
  });

  const watchedVaccineType = form.watch("vaccineType");
  const watchedInventoryId = form.watch("inventoryId");

  // Batches filtered to selected vaccine type
  const availableBatches = inventoryBatches.filter(
    (b) => !watchedVaccineType || b.vaccineType === watchedVaccineType
  );

  // Selected batch details
  const selectedBatch = inventoryBatches.find((b) => b.id === watchedInventoryId) ?? null;

  // Auto-suggest dose number when vaccine type changes
  const suggestDose = useCallback(
    (vType: string, hist: PatientHistory[]) => {
      const maxDoses = VACCINE_MAX_DOSES[vType as VaccineType] ?? 1;
      const given = hist.filter((h) => h.vaccineType === vType).length;
      const next = Math.min(given + 1, maxDoses);
      form.setValue("doseNumber", next);
    },
    [form]
  );

  const handleVaccineTypeChange = useCallback(
    (val: string) => {
      form.setValue("vaccineType", val);
      form.setValue("inventoryId", "");
      suggestDose(val, history);
    },
    [form, history, suggestDose]
  );

  const lookup = useCallback(
    async (method: LookupMethod, value: string, qrPayload?: string) => {
      if (!value.trim()) return;
      setLookupLoading(true);
      setPatient(null);
      setHistory([]);
      setValidationWarnings([]);
      setValidationBlocks([]);
      setSubmitted(false);
      form.reset({ doseNumber: 1, adverseReaction: "" });

      try {
        const params = new URLSearchParams();
        if (method === "nid") params.set("nid", value);
        else if (method === "booking") params.set("bookingRef", value);
        else if (method === "qr") params.set("qr", qrPayload ?? value);

        const res = await fetch(`/api/worker/patient/lookup?${params}`);
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? "Patient not found");
          return;
        }

        setPatient(data.patient);
        setHistory(data.history ?? []);
        setAppointmentId(data.appointmentId ?? null);
        setVaccineTypeHint(data.vaccineTypeHint ?? null);

        if (data.vaccineTypeHint && centerVaccines.includes(data.vaccineTypeHint)) {
          form.setValue("vaccineType", data.vaccineTypeHint);
          suggestDose(data.vaccineTypeHint, data.history ?? []);
        }
      } catch {
        toast.error("Network error — could not look up patient");
      } finally {
        setLookupLoading(false);
      }
    },
    [form, centerVaccines, suggestDose]
  );

  const handleQrDetected = useCallback(
    (qrText: string) => {
      if (qrText === lastQrRef.current) return;
      lastQrRef.current = qrText;
      setLookupInput(qrText);
      const parts = qrText.split(":");
      const userId = parts[1] ?? "";
      lookup("qr", userId, qrText);
    },
    [lookup]
  );

  const validate = useCallback(
    async (values: VaccinationFormValues): Promise<boolean> => {
      if (!patient) return false;
      const res = await fetch("/api/worker/vaccination/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: patient.id,
          vaccineType: values.vaccineType,
          doseNumber: values.doseNumber,
          qrPayload: lookupMethod === "qr" ? lookupInput : undefined,
        }),
      });
      const data = await res.json();
      setValidationWarnings(data.warnings ?? []);
      setValidationBlocks(data.blocks ?? []);
      return data.valid === true;
    },
    [patient, lookupMethod, lookupInput]
  );

  const onSubmit = useCallback(
    async (values: VaccinationFormValues) => {
      if (!patient || !selectedBatch) return;
      setSubmitting(true);
      setValidationWarnings([]);
      setValidationBlocks([]);

      const payload = {
        userId: patient.id,
        centerId,
        staffId,
        vaccineType: values.vaccineType,
        doseNumber: values.doseNumber,
        inventoryId: values.inventoryId,
        batchNo: selectedBatch.batchNo,
        lotNo: selectedBatch.lotNo,
        expiryDate: selectedBatch.expiryDate,
        adminSite: values.adminSite,
        adverseReaction: values.adverseReaction || undefined,
        appointmentId: appointmentId ?? undefined,
      };

      // Offline path
      if (!navigator.onLine) {
        try {
          await addToQueue(OFFLINE_STORE_NAMES.PENDING_VACCINATIONS, payload);
          toast.success("Saved locally — will sync when online", { duration: 5000 });
          setSubmitted(true);
        } catch {
          toast.error("Failed to save offline record");
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // Online path — validate first
      try {
        const isValid = await validate(values);
        if (!isValid) {
          setSubmitting(false);
          return;
        }
      } catch {
        toast.error("Validation check failed — check connection");
        setSubmitting(false);
        return;
      }

      // Record
      try {
        const res = await fetch("/api/worker/vaccination/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setValidationBlocks([data.error ?? "Duplicate or inventory conflict"]);
          } else {
            toast.error(data.error ?? "Failed to record vaccination");
          }
          return;
        }

        toast.success("Vaccination recorded successfully");
        setSubmitted(true);
      } catch {
        toast.error("Network error — record not saved");
      } finally {
        setSubmitting(false);
      }
    },
    [patient, selectedBatch, centerId, staffId, appointmentId, validate]
  );

  const reset = useCallback(() => {
    setPatient(null);
    setHistory([]);
    setLookupInput("");
    setAppointmentId(null);
    setVaccineTypeHint(null);
    setValidationWarnings([]);
    setValidationBlocks([]);
    setSubmitted(false);
    lastQrRef.current = "";
    form.reset({ doseNumber: 1, adverseReaction: "" });
  }, [form]);

  return {
    lookupMethod, setLookupMethod,
    lookupInput, setLookupInput,
    lookupLoading,
    patient, history,
    vaccineTypeHint,
    validationWarnings, validationBlocks,
    submitting, submitted,
    form,
    watchedVaccineType,
    availableBatches,
    selectedBatch,
    handleVaccineTypeChange,
    handleQrDetected,
    lookup,
    onSubmit,
    reset,
  };
}
