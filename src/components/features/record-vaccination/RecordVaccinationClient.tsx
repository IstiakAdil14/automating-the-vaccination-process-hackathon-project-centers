"use client";

import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode, Hash, BookOpen, Search, AlertTriangle,
  XCircle, CheckCircle2, RotateCcw, WifiOff, Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QrScanner } from "./QrScanner";
import { PatientCard } from "./PatientCard";
import { cn } from "@/lib/utils/cn";
import { useRecordVaccination, type LookupMethod, type InventoryBatch } from "@/hooks/useRecordVaccination";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

interface Props {
  centerId: string;
  staffId: string;
  staffName: string;
  centerVaccines: string[];
  inventoryBatches: InventoryBatch[];
}

const LOOKUP_TABS: { id: LookupMethod; label: string; icon: React.ElementType }[] = [
  { id: "qr", label: "QR Scan", icon: QrCode },
  { id: "nid", label: "NID", icon: Hash },
  { id: "booking", label: "Booking Ref", icon: BookOpen },
];

const ADMIN_SITES = [
  { value: "left_arm", label: "Left Arm" },
  { value: "right_arm", label: "Right Arm" },
  { value: "left_thigh", label: "Left Thigh" },
  { value: "right_thigh", label: "Right Thigh" },
] as const;

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
}

export function RecordVaccinationClient({
  centerId, staffId, staffName, centerVaccines, inventoryBatches,
}: Props) {
  const { isOnline } = useOfflineStatus();

  const {
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
  } = useRecordVaccination(centerId, staffId, inventoryBatches, centerVaccines);

  const { register, handleSubmit, formState: { errors }, watch } = form;
  const watchedInventoryId = watch("inventoryId");

  return (
    <>
      <Toaster position="top-right" richColors />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              Record Vaccination
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Staff: {staffName}</p>
          </div>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-subtle text-warning-foreground text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              Offline — records saved locally
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── LEFT COLUMN: Lookup + Patient ── */}
          <div className="space-y-5">
            {/* Lookup method tabs */}
            <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
              <div className="flex border-b border-border">
                {LOOKUP_TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setLookupMethod(id); setLookupInput(""); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                      lookupMethod === id
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {lookupMethod === "qr" ? (
                  <QrScanner onDetected={handleQrDetected} active={lookupMethod === "qr"} />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={lookupMethod === "nid" ? "Enter NID number…" : "Enter booking reference…"}
                      value={lookupInput}
                      onChange={(e) => setLookupInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && lookup(lookupMethod, lookupInput)}
                    />
                    <Button
                      onClick={() => lookup(lookupMethod, lookupInput)}
                      loading={lookupLoading}
                      disabled={!lookupInput.trim()}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Patient card + history */}
            <AnimatePresence>
              {patient && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <PatientCard
                    patient={patient}
                    history={history}
                    expectedVaccineType={watchedVaccineType || vaccineTypeHint}
                    expectedDose={form.watch("doseNumber")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT COLUMN: Vaccine Form ── */}
          <div>
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-accent/30 bg-accent-subtle p-8 flex flex-col items-center gap-4 text-center"
                >
                  <CheckCircle2 className="w-14 h-14 text-accent" />
                  <div>
                    <p className="font-semibold text-accent-foreground text-lg">
                      {isOnline ? "Vaccination Recorded" : "Saved Locally"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isOnline
                        ? "Record saved, inventory updated, and reminder scheduled."
                        : "Will sync automatically when connection is restored."}
                    </p>
                  </div>
                  <Button onClick={reset} variant="outline">
                    <RotateCcw className="w-4 h-4" /> Record Another
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-5"
                >
                  <h2 className="font-semibold text-foreground">Vaccine Details</h2>

                  {/* Vaccine type */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Vaccine</label>
                    <select
                      className={cn(
                        "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        errors.vaccineType ? "border-danger" : "border-border"
                      )}
                      value={watchedVaccineType ?? ""}
                      onChange={(e) => handleVaccineTypeChange(e.target.value)}
                      disabled={!patient}
                    >
                      <option value="">Select vaccine…</option>
                      {centerVaccines.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    {errors.vaccineType && (
                      <p className="text-xs text-danger">{errors.vaccineType.message}</p>
                    )}
                  </div>

                  {/* Dose number */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Dose Number</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...register("doseNumber")}
                      error={!!errors.doseNumber}
                      disabled={!patient}
                    />
                    {errors.doseNumber && (
                      <p className="text-xs text-danger">{errors.doseNumber.message}</p>
                    )}
                  </div>

                  {/* Batch / lot */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Batch / Lot</label>
                    <select
                      className={cn(
                        "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        errors.inventoryId ? "border-danger" : "border-border"
                      )}
                      {...register("inventoryId")}
                      disabled={!patient || !watchedVaccineType}
                    >
                      <option value="">Select batch…</option>
                      {availableBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchNo} — Lot {b.lotNo} ({b.quantity} left)
                        </option>
                      ))}
                    </select>
                    {errors.inventoryId && (
                      <p className="text-xs text-danger">{errors.inventoryId.message}</p>
                    )}
                    {availableBatches.length === 0 && watchedVaccineType && (
                      <p className="text-xs text-danger font-medium">
                        ⚠ No stock available for {watchedVaccineType}
                      </p>
                    )}
                  </div>

                  {/* Expiry date (read-only) */}
                  {selectedBatch && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Expiry Date</label>
                      <Input
                        value={formatExpiry(selectedBatch.expiryDate)}
                        readOnly
                        className="bg-muted cursor-default"
                      />
                    </div>
                  )}

                  {/* Administration site */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Administration Site</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ADMIN_SITES.map(({ value, label }) => {
                        const checked = form.watch("adminSite") === value;
                        return (
                          <label
                            key={value}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer text-sm transition-colors",
                              checked
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border hover:bg-muted text-foreground"
                            )}
                          >
                            <input
                              type="radio"
                              value={value}
                              {...register("adminSite")}
                              className="sr-only"
                              disabled={!patient}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                    {errors.adminSite && (
                      <p className="text-xs text-danger">{errors.adminSite.message}</p>
                    )}
                  </div>

                  {/* Adverse reaction (optional) */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Adverse Reaction <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                      {...register("adverseReaction")}
                      rows={2}
                      placeholder="Note any immediate reactions observed…"
                      disabled={!patient}
                      className={cn(
                        "flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
                        "placeholder:text-muted-foreground resize-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    />
                  </div>

                  {/* Validation blocks */}
                  {validationBlocks.length > 0 && (
                    <div className="rounded-lg bg-danger-subtle border border-danger/30 p-3 space-y-1">
                      {validationBlocks.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-danger-foreground">
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          {b}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Validation warnings */}
                  {validationWarnings.length > 0 && (
                    <div className="rounded-lg bg-warning-subtle border border-warning/30 p-3 space-y-1">
                      {validationWarnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-warning-foreground">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={submitting}
                    disabled={!patient || submitting || validationBlocks.length > 0}
                  >
                    <Syringe className="w-4 h-4" />
                    {isOnline ? "Record Vaccination" : "Save Offline"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
