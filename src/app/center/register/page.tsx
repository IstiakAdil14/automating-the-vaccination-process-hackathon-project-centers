"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import {
  Building2, MapPin, Phone, Clock, FileText, KeyRound,
  ChevronRight, ChevronLeft, Syringe, Upload, X, CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

// ── Bangladesh geo data ───────────────────────────────────────────────────────
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
const CENTER_TYPES = ["Government Hospital", "Upazila Health Complex", "Community Clinic", "Private Hospital", "NGO Health Center", "District Hospital"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };

// ── Zod schemas per step ──────────────────────────────────────────────────────
const step1Schema = z.object({
  centerName: z.string().min(3, "Center name must be at least 3 characters"),
  licenseNumber: z.string().min(4, "Enter a valid license/registration number"),
  centerType: z.string().min(1, "Select a center type"),
  establishedYear: z
    .number({ invalid_type_error: "Enter a valid year" })
    .min(1900)
    .max(new Date().getFullYear(), `Year cannot exceed ${new Date().getFullYear()}`),
});

const step2Schema = z.object({
  division: z.string().min(1, "Select a division"),
  district: z.string().min(1, "Select a district"),
  localBodyType: z.enum(["Upazila", "City Corporation", "Pourashava"], { errorMap: () => ({ message: "Select a local body type" }) }),
  upazila: z.string().min(2, "Enter name"),
  address: z.string().min(5, "Enter full address"),
  geoLat: z.number().min(-90).max(90).optional(),
  geoLng: z.number().min(-180).max(180).optional(),
});

const step3Schema = z.object({
  contactName: z.string().min(2, "Enter contact name"),
  designation: z.string().min(2, "Enter designation"),
  phone: z.string().regex(/^(\+880|0)1[3-9]\d{8}$/, "Enter a valid BD phone number"),
  email: z.string().email("Enter a valid email address"),
});

const dayScheduleSchema = z.object({
  open: z.boolean(),
  morningStart: z.string(),
  morningEnd: z.string(),
  eveningStart: z.string(),
  eveningEnd: z.string(),
});

const step4Schema = z.object({
  schedule: z.record(dayScheduleSchema),
});

const step5Schema = z.object({
  facilityLicenseUrl: z.string().min(1, "Upload facility license"),
  centerPhotoUrl: z.string().min(1, "Upload center photo"),
  officerNidUrl: z.string().min(1, "Upload officer NID"),
});

const step6BaseSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6BaseSchema)
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof fullSchema>;

const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6BaseSchema];

// ── Default schedule ──────────────────────────────────────────────────────────
const defaultSchedule = Object.fromEntries(
  DAYS.map((d) => [d, { open: d !== "Friday" && d !== "Saturday", morningStart: "08:00", morningEnd: "12:00", eveningStart: "14:00", eveningEnd: "18:00" }])
);

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Basic Info", icon: Building2 },
  { label: "Location", icon: MapPin },
  { label: "Contact", icon: Phone },
  { label: "Hours", icon: Clock },
  { label: "Documents", icon: FileText },
  { label: "Password", icon: KeyRound },
];

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Select wrapper ────────────────────────────────────────────────────────────
function Select({ error, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-danger" : "border-border",
        className
      )}
      {...props}
    />
  );
}

// ── Step 1: Basic Info ────────────────────────────────────────────────────────
function Step1() {
  const { register, formState: { errors } } = useFormContext<FormData>();
  return (
    <div className="space-y-4">
      <Field label="Center Name" error={errors.centerName?.message}>
        <Input error={!!errors.centerName} placeholder="e.g. Dhaka Medical College Hospital" {...register("centerName")} />
      </Field>
      <Field label="License / Registration Number" error={errors.licenseNumber?.message}>
        <Input error={!!errors.licenseNumber} placeholder="e.g. DGHS-2024-001234" {...register("licenseNumber")} />
      </Field>
      <Field label="Center Type" error={errors.centerType?.message}>
        <Select error={!!errors.centerType} {...register("centerType")}>
          <option value="">Select type…</option>
          {CENTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Established Year" error={errors.establishedYear?.message}>
        <Input
          type="number"
          error={!!errors.establishedYear}
          placeholder="e.g. 1998"
          {...register("establishedYear", { valueAsNumber: true })}
        />
      </Field>
    </div>
  );
}

// ── Step 2: Location ──────────────────────────────────────────────────────────
function Step2() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FormData>();
  const lat = watch("geoLat");
  const lng = watch("geoLng");
  const division = watch("division");
  const district = watch("district");
  const localBodyType = watch("localBodyType");
  const markerPos = lat && lng ? { lat, lng } : null;

  const districts = division ? (DISTRICTS_BY_DIVISION[division] ?? []) : [];

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setValue("geoLat", e.latLng.lat(), { shouldValidate: true });
        setValue("geoLng", e.latLng.lng(), { shouldValidate: true });
      }
    },
    [setValue]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Division" error={errors.division?.message}>
          <Select
            error={!!errors.division}
            value={division}
            {...register("division", {
              onChange: () => setValue("district", "", { shouldValidate: false }),
            })}
          >
            <option value="">Select…</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="District" error={errors.district?.message}>
          <Select
            error={!!errors.district}
            disabled={!division}
            value={district}
            {...register("district")}
          >
            <option value="">{division ? "Select…" : "Select division first"}</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Local Body Type" error={errors.localBodyType?.message}>
          <Select
            error={!!errors.localBodyType}
            value={localBodyType ?? ""}
            {...register("localBodyType")}
          >
            <option value="">Select…</option>
            {LOCAL_BODY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field
          label={localBodyType ? `${localBodyType} Name` : "Upazila / Area Name"}
          error={errors.upazila?.message}
        >
          <Input
            error={!!errors.upazila}
            placeholder={
              localBodyType === "City Corporation" ? "e.g. Dhaka North" :
              localBodyType === "Pourashava" ? "e.g. Savar" :
              "e.g. Mirpur"
            }
            {...register("upazila")}
          />
        </Field>
      </div>
      <Field label="Full Address" error={errors.address?.message}>
        <Input error={!!errors.address} placeholder="Street, area, postal code" {...register("address")} />
      </Field>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Pin Location on Map <span className="text-muted-foreground font-normal">(optional — click to place)</span>
        </label>
        <div className="rounded-lg overflow-hidden border border-border h-56">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={markerPos ?? DEFAULT_CENTER}
              zoom={markerPos ? 14 : 7}
              onClick={onMapClick}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              {markerPos && <Marker position={markerPos} />}
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
              Loading map…
            </div>
          )}
        </div>
        {markerPos && (
          <p className="text-xs text-muted-foreground">
            Lat: {markerPos.lat.toFixed(5)}, Lng: {markerPos.lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Contact Details ───────────────────────────────────────────────────
function Step3() {
  const { register, formState: { errors } } = useFormContext<FormData>();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-accent-subtle/40 px-4 py-3 text-sm text-accent-foreground">
        These contact details will be used as login credentials for the center portal.
      </div>
      <Field label="Primary Contact Name" error={errors.contactName?.message}>
        <Input error={!!errors.contactName} placeholder="Full name" {...register("contactName")} />
      </Field>
      <Field label="Designation" error={errors.designation?.message}>
        <Input error={!!errors.designation} placeholder="e.g. Medical Officer, Center Manager" {...register("designation")} />
      </Field>
      <Field label="Phone Number" error={errors.phone?.message}>
        <Input error={!!errors.phone} placeholder="+8801XXXXXXXXX" {...register("phone")} />
      </Field>
      <Field label="Official Email" error={errors.email?.message}>
        <Input type="email" error={!!errors.email} placeholder="officer@center.gov.bd" {...register("email")} />
      </Field>
    </div>
  );
}

// ── Step 4: Operating Hours ───────────────────────────────────────────────────
function Step4() {
  const { register, watch, setValue } = useFormContext<FormData>();
  const schedule = watch("schedule");

  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const isOpen = schedule?.[day]?.open ?? false;
        return (
          <div key={day} className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{day}</span>
              <button
                type="button"
                onClick={() => setValue(`schedule.${day}.open`, !isOpen, { shouldValidate: true })}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isOpen ? "bg-primary" : "bg-muted"
                )}
                aria-label={`Toggle ${day}`}
              >
                <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", isOpen ? "translate-x-4" : "translate-x-1")} />
              </button>
            </div>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Morning shift</p>
                  <div className="flex items-center gap-1.5">
                    <input type="time" className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" {...register(`schedule.${day}.morningStart`)} />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input type="time" className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" {...register(`schedule.${day}.morningEnd`)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Evening shift</p>
                  <div className="flex items-center gap-1.5">
                    <input type="time" className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" {...register(`schedule.${day}.eveningStart`)} />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input type="time" className="flex-1 h-8 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" {...register(`schedule.${day}.eveningEnd`)} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 5: Document Upload ───────────────────────────────────────────────────
type UploadField = "facilityLicenseUrl" | "centerPhotoUrl" | "officerNidUrl";

function FileUploadSlot({
  label,
  hint,
  field,
  accept,
}: {
  label: string;
  hint: string;
  field: UploadField;
  accept: string;
}) {
  const { setValue, watch, formState: { errors } } = useFormContext<FormData>();
  const url = watch(field);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    const allowed = ["image/jpeg", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Only JPG and PDF allowed"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      const res = await fetch("/api/center/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setValue(field, data.url, { shouldValidate: true });
      if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file));
      else setPreview("pdf");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const error = errors[field]?.message;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {url ? (
        <div className="relative rounded-lg border border-border bg-muted flex items-center gap-3 px-4 py-3">
          {preview === "pdf" ? (
            <FileText className="w-8 h-8 text-primary shrink-0" />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="w-12 h-12 rounded object-cover shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
          )}
          <span className="text-sm text-foreground truncate flex-1">Uploaded successfully</span>
          <button
            type="button"
            onClick={() => { setValue(field, "", { shouldValidate: true }); setPreview(null); }}
            className="text-muted-foreground hover:text-danger transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full rounded-lg border-2 border-dashed px-4 py-6 flex flex-col items-center gap-2 transition-colors",
            error ? "border-danger" : "border-border hover:border-primary",
            uploading && "opacity-60 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload"}</span>
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

function Step5() {
  return (
    <div className="space-y-5">
      <FileUploadSlot label="Facility License" hint="PDF or JPG — max 5MB" field="facilityLicenseUrl" accept=".pdf,.jpg,.jpeg" />
      <FileUploadSlot label="Center Photo" hint="JPG — exterior or main hall — max 5MB" field="centerPhotoUrl" accept=".jpg,.jpeg" />
      <FileUploadSlot label="Officer NID" hint="JPG of the primary contact's National ID — max 5MB" field="officerNidUrl" accept=".jpg,.jpeg" />
    </div>
  );
}

// ── Step 6: Password Setup ────────────────────────────────────────────────────
function Step6() {
  const { register, formState: { errors } } = useFormContext<FormData>();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-accent-subtle/40 px-4 py-3 text-sm text-accent-foreground">
        Set a secure password to log in to the center portal after your application is approved.
      </div>
      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Input
            type={showPass ? "text" : "password"}
            error={!!errors.password}
            placeholder="Min. 8 characters"
            {...register("password")}
          />
          <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
      <Field label="Confirm Password" error={errors.confirmPassword?.message}>
        <div className="relative">
          <Input
            type={showConfirm ? "text" : "password"}
            error={!!errors.confirmPassword}
            placeholder="Re-enter password"
            {...register("confirmPassword")}
          />
          <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>
    </div>
  );
}

// ── Step components map ───────────────────────────────────────────────────────
const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6];

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function CenterRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    mode: "onChange",
    defaultValues: {
      centerName: "", licenseNumber: "", centerType: "", establishedYear: undefined,
      division: "", district: "", localBodyType: undefined, upazila: "", address: "", geoLat: undefined as number | undefined, geoLng: undefined as number | undefined,
      contactName: "", designation: "", phone: "", email: "",
      schedule: defaultSchedule,
      facilityLicenseUrl: "", centerPhotoUrl: "", officerNidUrl: "", password: "", confirmPassword: "",
    },
  });

  const { handleSubmit, trigger, getValues } = methods;

  async function goNext() {
    const fields = Object.keys(stepSchemas[step].shape) as (keyof FormData)[];
    // step 4 uses nested schedule — trigger all
    // step 6 (password) needs cross-field confirmPassword check via full schema
    const valid = step === 3 ? await trigger("schedule") : await trigger(fields);
    if (!valid) return;
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/center/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      router.push(`/center/register/success?ref=${json.referenceNumber}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  const StepComponent = STEP_COMPONENTS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6 space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-2">
            <Syringe className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Center Registration</h1>
          <p className="text-sm text-muted-foreground">Apply to join the VaccinationBD platform</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 space-y-3">
          <div className="flex justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    i < step ? "bg-primary text-primary-foreground" :
                    i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={cn("text-xs hidden sm:block", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Track */}
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              animate={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{STEPS[step].label}</h2>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 min-h-[320px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <StepComponent />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={goBack}
                  disabled={step === 0}
                  className="gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>

                {isLast ? (
                  <Button type="submit" size="md" loading={submitting} className="gap-1.5">
                    {submitting ? "Submitting…" : "Submit Application"}
                  </Button>
                ) : (
                  <Button type="button" size="md" onClick={goNext} className="gap-1.5">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
