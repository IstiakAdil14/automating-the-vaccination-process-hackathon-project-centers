"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Syringe, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VACCINE_TYPES } from "@/lib/constants";

// ── Step schemas ──────────────────────────────────────────────────────────────
const step1Schema = z.object({
  centerName: z.string().min(3, "Center name is required"),
  licenseNumber: z.string().min(3, "License number is required"),
  centerType: z.string().min(1, "Select a center type"),
  establishedYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
});

const step2Schema = z.object({
  division: z.string().min(1, "Division is required"),
  district: z.string().min(1, "District is required"),
  localBodyType: z.enum(["Upazila", "City Corporation", "Pourashava"], { errorMap: () => ({ message: "Select local body type" }) }),
  localBodyName: z.string().min(1, "Name is required"),
  address: z.string().min(5, "Full address is required"),
  geoLat: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  geoLng: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
});

const step3Schema = z.object({
  contactName: z.string().min(2, "Contact name is required"),
  designation: z.string().min(2, "Designation is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required"),
});

const step4Schema = z.object({
  vaccines: z.array(z.string()).min(1, "Select at least one vaccine"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
});

const step5Schema = z.object({
  facilityLicenseUrl: z.string().url("Enter a valid URL"),
  centerPhotoUrl: z.string().url("Enter a valid URL"),
  officerNidUrl: z.string().url("Enter a valid URL"),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;
type Step4 = z.infer<typeof step4Schema>;
type Step5 = z.infer<typeof step5Schema>;

const STEPS = ["Center Info", "Location", "Contact", "Services", "Documents"];

const CENTER_TYPES = ["Government", "Private", "NGO", "Military", "Community"];
const DIVISIONS = ["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barisal", "Sylhet", "Rangpur", "Mymensingh"];

const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj", "Narsingdi", "Manikganj", "Munshiganj", "Rajbari", "Madaripur", "Shariatpur", "Faridpur", "Gopalganj", "Kishoreganj", "Tangail"],
  Chittagong: ["Chittagong", "Cox's Bazar", "Comilla", "Feni", "Brahmanbaria", "Rangamati", "Noakhali", "Chandpur", "Lakshmipur", "Khagrachhari", "Bandarban"],
  Rajshahi: ["Rajshahi", "Bogura", "Pabna", "Sirajganj", "Natore", "Naogaon", "Chapainawabganj", "Joypurhat"],
  Khulna: ["Khulna", "Jessore", "Satkhira", "Bagerhat", "Chuadanga", "Jhenaidah", "Magura", "Meherpur", "Narail", "Kushtia"],
  Barisal: ["Barisal", "Bhola", "Patuakhali", "Pirojpur", "Jhalokati", "Barguna"],
  Sylhet: ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
  Rangpur: ["Rangpur", "Dinajpur", "Kurigram", "Gaibandha", "Nilphamari", "Lalmonirhat", "Thakurgaon", "Panchagarh"],
  Mymensingh: ["Mymensingh", "Jamalpur", "Sherpur", "Netrokona"],
};

const LOCAL_BODY_TYPES = ["Upazila", "City Corporation", "Pourashava"] as const;

// ── Step 2 Location sub-component ────────────────────────────────────────────
function Step2Location({ form2 }: { form2: ReturnType<typeof useForm<Step2>> }) {
  const division = form2.watch("division");
  const localBodyType = form2.watch("localBodyType");
  const districts = division ? (DISTRICTS_BY_DIVISION[division] ?? []) : [];
  const selectClass = "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Division" error={form2.formState.errors.division?.message}>
          <select
            value={form2.watch("division")}
            {...form2.register("division", {
              onChange: () => form2.setValue("district", "", { shouldValidate: false }),
            })}
            className={selectClass}
          >
            <option value="">Select…</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="District" error={form2.formState.errors.district?.message}>
          <select
            value={form2.watch("district")}
            disabled={!division}
            {...form2.register("district")}
            className={selectClass}
          >
            <option value="">{division ? "Select…" : "Select division first"}</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Local Body Type" error={form2.formState.errors.localBodyType?.message}>
          <select
            value={form2.watch("localBodyType") ?? ""}
            {...form2.register("localBodyType")}
            className={selectClass}
          >
            <option value="">Select…</option>
            {LOCAL_BODY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field
          label={localBodyType ? `${localBodyType} Name` : "Upazila / Area Name"}
          error={form2.formState.errors.localBodyName?.message}
        >
          <Input
            placeholder={
              localBodyType === "City Corporation" ? "e.g. Dhaka North" :
              localBodyType === "Pourashava" ? "e.g. Savar" :
              "e.g. Mirpur"
            }
            {...form2.register("localBodyName")}
            error={!!form2.formState.errors.localBodyName}
          />
        </Field>
      </div>
      <Field label="Full Address" error={form2.formState.errors.address?.message}>
        <Input placeholder="House 12, Road 5, Mirpur-10" {...form2.register("address")} error={!!form2.formState.errors.address} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitude (optional)" error={form2.formState.errors.geoLat?.message}>
          <Input type="number" step="any" placeholder="23.8103" {...form2.register("geoLat")} error={!!form2.formState.errors.geoLat} />
        </Field>
        <Field label="Longitude (optional)" error={form2.formState.errors.geoLng?.message}>
          <Input type="number" step="any" placeholder="90.4125" {...form2.register("geoLng")} error={!!form2.formState.errors.geoLng} />
        </Field>
      </div>
    </>
  );
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState<string | null>(null);

  // Accumulated form data across steps
  const [formData, setFormData] = useState<Partial<Step1 & Step2 & Step3 & Step4 & Step5>>({});

  // Per-step forms
  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: formData });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: formData });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema), defaultValues: formData });
  const form4 = useForm<Step4>({ resolver: zodResolver(step4Schema), defaultValues: { vaccines: [], ...formData } });
  const form5 = useForm<Step5>({ resolver: zodResolver(step5Schema), defaultValues: formData });

  const forms = [form1, form2, form3, form4, form5];

  async function handleNext() {
    const currentForm = forms[step];
    const valid = await currentForm.trigger();
    if (!valid) return;
    const values = currentForm.getValues();
    setFormData((prev) => ({ ...prev, ...values }));
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const valid = await form5.trigger();
    if (!valid) return;
    const finalData = { ...formData, ...form5.getValues() };
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/center/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Registration failed");
      setRefNumber(json.referenceNumber);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (refNumber) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card shadow-lg p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Application Submitted</h2>
          <p className="text-sm text-muted-foreground">
            Your center registration is under review. You will receive an email once approved.
          </p>
          <div className="rounded-lg bg-muted px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
            <p className="font-mono font-semibold text-foreground">{refNumber}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            After admin approval, your center email will be added to the system and you can log in.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full mt-2">Back to Login</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-lg"
    >
      <div className="rounded-2xl border border-border bg-card shadow-lg p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-1">
            <Syringe className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Center Registration</h1>
          <p className="text-xs text-muted-foreground">Apply to join the VaccinationBD network</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[10px] ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {serverError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {serverError}
          </div>
        )}

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Step 1 — Center Info */}
            {step === 0 && (
              <>
                <Field label="Center Name" error={form1.formState.errors.centerName?.message}>
                  <Input placeholder="Dhaka Central Vaccination Center" {...form1.register("centerName")} error={!!form1.formState.errors.centerName} />
                </Field>
                <Field label="License Number" error={form1.formState.errors.licenseNumber?.message}>
                  <Input placeholder="MOH-2024-XXXXX" {...form1.register("licenseNumber")} error={!!form1.formState.errors.licenseNumber} />
                </Field>
                <Field label="Center Type" error={form1.formState.errors.centerType?.message}>
                  <select
                    {...form1.register("centerType")}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select type…</option>
                    {CENTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Established Year" error={form1.formState.errors.establishedYear?.message}>
                  <Input type="number" placeholder="2010" {...form1.register("establishedYear")} error={!!form1.formState.errors.establishedYear} />
                </Field>
              </>
            )}

            {/* Step 2 — Location */}
            {step === 1 && (
              <Step2Location form2={form2} />
            )}

            {/* Step 3 — Contact */}
            {step === 2 && (
              <>
                <Field label="Contact Person Name" error={form3.formState.errors.contactName?.message}>
                  <Input placeholder="Dr. Rahim Uddin" {...form3.register("contactName")} error={!!form3.formState.errors.contactName} />
                </Field>
                <Field label="Designation" error={form3.formState.errors.designation?.message}>
                  <Input placeholder="Center Manager" {...form3.register("designation")} error={!!form3.formState.errors.designation} />
                </Field>
                <Field label="Phone" error={form3.formState.errors.phone?.message}>
                  <Input type="tel" placeholder="+8801XXXXXXXXX" {...form3.register("phone")} error={!!form3.formState.errors.phone} />
                </Field>
                <Field label="Center Email" error={form3.formState.errors.email?.message}>
                  <Input type="email" placeholder="center@hospital.gov.bd" {...form3.register("email")} error={!!form3.formState.errors.email} />
                </Field>
                <p className="text-xs text-muted-foreground">
                  This email will be used for Google login after admin approval.
                </p>
              </>
            )}

            {/* Step 4 — Services */}
            {step === 3 && (
              <>
                <Field label="Daily Patient Capacity" error={form4.formState.errors.capacity?.message}>
                  <Input type="number" placeholder="100" {...form4.register("capacity")} error={!!form4.formState.errors.capacity} />
                </Field>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Vaccines Offered</label>
                  {form4.formState.errors.vaccines && (
                    <p className="text-xs text-destructive">{form4.formState.errors.vaccines.message}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {VACCINE_TYPES.map((v) => {
                      const checked = (form4.watch("vaccines") ?? []).includes(v);
                      return (
                        <label
                          key={v}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            checked ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            value={v}
                            checked={checked}
                            onChange={(e) => {
                              const current = form4.getValues("vaccines") ?? [];
                              form4.setValue(
                                "vaccines",
                                e.target.checked ? [...current, v] : current.filter((x) => x !== v),
                                { shouldValidate: true }
                              );
                            }}
                          />
                          {v}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Step 5 — Documents */}
            {step === 4 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Upload documents to a file hosting service (e.g. Google Drive) and paste the public URLs below.
                </p>
                <Field label="Facility License URL" error={form5.formState.errors.facilityLicenseUrl?.message}>
                  <Input type="url" placeholder="https://drive.google.com/..." {...form5.register("facilityLicenseUrl")} error={!!form5.formState.errors.facilityLicenseUrl} />
                </Field>
                <Field label="Center Photo URL" error={form5.formState.errors.centerPhotoUrl?.message}>
                  <Input type="url" placeholder="https://drive.google.com/..." {...form5.register("centerPhotoUrl")} error={!!form5.formState.errors.centerPhotoUrl} />
                </Field>
                <Field label="Officer NID URL" error={form5.formState.errors.officerNidUrl?.message}>
                  <Input type="url" placeholder="https://drive.google.com/..." {...form5.register("officerNidUrl")} error={!!form5.formState.errors.officerNidUrl} />
                </Field>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" size="lg" className="flex-1" onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" size="lg" className="flex-1" loading={submitting} onClick={handleSubmit}>
              {submitting ? "Submitting…" : "Submit Application"}
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </motion.div>
  );
}
