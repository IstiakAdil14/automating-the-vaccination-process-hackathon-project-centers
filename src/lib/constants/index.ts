// lib/constants/index.ts
// Single source of truth for all app-wide constants.
// Use `as const` throughout so TypeScript narrows to literal types,
// enabling full IntelliSense and exhaustive checks across the codebase.

// ── App ───────────────────────────────────────────────────────────────────────
export const APP_NAME = "VaccinationBD Centers" as const;
export const APP_PORT = 3002 as const;
export const DB_NAME = "vaccinationDB" as const;

// ── Roles ─────────────────────────────────────────────────────────────────────
// Maps to the `role` field on the Users collection shared across all 3 apps.
export const ROLES = {
  STAFF: "staff",       // Health worker at a vaccination center
  SUPERVISOR: "supervisor", // Senior staff with extra permissions (approve walk-ins, etc.)
  ADMIN: "admin",       // Government admin (vaccination-admin app)
  CITIZEN: "citizen",   // End user (vaccination-citizen app)
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ── Vaccine Types ─────────────────────────────────────────────────────────────
// Matches the `vaccineType` field in Appointments, VaccinationRecords, Inventory.
export const VACCINE_TYPES = [
  "COVID-19",
  "Polio",
  "Measles",
  "Hepatitis B",
  "BCG",
  "DPT",
  "Influenza",
  "Typhoid",
  "Cholera",
] as const;

export type VaccineType = (typeof VACCINE_TYPES)[number];

// Max doses per vaccine type — used for validation and UI progress indicators
export const VACCINE_MAX_DOSES: Record<VaccineType, number> = {
  "COVID-19": 3,
  "Polio": 4,
  "Measles": 2,
  "Hepatitis B": 3,
  "BCG": 1,
  "DPT": 3,
  "Influenza": 1,
  "Typhoid": 1,
  "Cholera": 2,
};

// ── Appointment Statuses ──────────────────────────────────────────────────────
// Lifecycle of an appointment in the Appointments collection.
export const APPOINTMENT_STATUSES = {
  PENDING: "pending",       // Booked, not yet confirmed by center
  CONFIRMED: "confirmed",   // Center confirmed the slot
  COMPLETED: "completed",   // Vaccination administered
  CANCELLED: "cancelled",   // Cancelled by citizen or staff
  NO_SHOW: "no_show",       // Citizen did not arrive
  RESCHEDULED: "rescheduled",
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[keyof typeof APPOINTMENT_STATUSES];

// ── Queue Statuses ────────────────────────────────────────────────────────────
// Real-time status of a patient in the walk-in / daily queue.
export const QUEUE_STATUSES = {
  WAITING: "waiting",         // In queue, not yet called
  CALLED: "called",           // Token called, patient should proceed
  IN_PROGRESS: "in_progress", // Vaccination in progress
  DONE: "done",               // Vaccination completed
  SKIPPED: "skipped",         // Did not respond when called
  DEFERRED: "deferred",       // Moved to next available slot
} as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[keyof typeof QUEUE_STATUSES];

// ── Shift Types ───────────────────────────────────────────────────────────────
// Staff shift scheduling — used in shift management and performance tracking.
export const SHIFT_TYPES = {
  MORNING: "morning",     // 08:00 – 14:00
  AFTERNOON: "afternoon", // 14:00 – 20:00
  NIGHT: "night",         // 20:00 – 08:00 (emergency centers only)
} as const;

export type ShiftType = (typeof SHIFT_TYPES)[keyof typeof SHIFT_TYPES];

export const SHIFT_HOURS: Record<ShiftType, { start: string; end: string }> = {
  morning: { start: "08:00", end: "14:00" },
  afternoon: { start: "14:00", end: "20:00" },
  night: { start: "20:00", end: "08:00" },
};

// ── Fraud Alert Types ─────────────────────────────────────────────────────────
// Mirrors the FraudAlerts collection — used for duplicate/tamper detection.
export const FRAUD_ALERT_TYPES = {
  DUPLICATE_RECORD: "duplicate_record",   // Same citizen vaccinated twice same day
  QR_TAMPER: "qr_tamper",                 // Vaccine passport QR code mismatch
  EXCESS_DOSES: "excess_doses",           // More doses than allowed for vaccine type
  IDENTITY_MISMATCH: "identity_mismatch", // NID/birth cert doesn't match record
  SUSPICIOUS_VOLUME: "suspicious_volume", // Abnormally high vaccinations in short time
} as const;

export type FraudAlertType = (typeof FRAUD_ALERT_TYPES)[keyof typeof FRAUD_ALERT_TYPES];

export const FRAUD_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type FraudSeverity = (typeof FRAUD_SEVERITY)[keyof typeof FRAUD_SEVERITY];

// ── Inventory ─────────────────────────────────────────────────────────────────
// Thresholds used to trigger low-stock warnings in the UI and restock requests.
export const INVENTORY_THRESHOLDS = {
  LOW_STOCK: 20,      // Show warning badge when quantity ≤ this
  CRITICAL_STOCK: 5,  // Show critical badge and auto-alert admin
} as const;

// ── Pagination ────────────────────────────────────────────────────────────────
// Default pagination values for all data tables and API list endpoints.
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const;

// ── Offline Sync ──────────────────────────────────────────────────────────────
// IndexedDB / localStorage keys used by the offline-first Service Worker layer.
export const OFFLINE_SYNC_KEY = "vcbd_centers_offline_queue" as const;
export const OFFLINE_DB_NAME = "vcbd_centers_idb" as const;
export const OFFLINE_DB_VERSION = 2 as const;
export const OFFLINE_STORE_NAMES = {
  PENDING_VACCINATIONS: "pending_vaccinations", // Vaccination records queued while offline
  PENDING_CHECKINS:     "pending_checkins",     // Appointment check-ins queued while offline
  PENDING_TOKENS:       "pending_tokens",       // Walk-in queue tokens queued while offline
  CACHED_APPOINTMENTS:  "cached_appointments",  // Appointments cached for offline read
  CACHED_INVENTORY:     "cached_inventory",     // Inventory cached for offline read
  CACHED_SLOTS:         "cached_slots",         // Slot data cached for offline view
} as const;

export type OfflineStoreName = (typeof OFFLINE_STORE_NAMES)[keyof typeof OFFLINE_STORE_NAMES];

// Pending stores that need syncing (subset of OFFLINE_STORE_NAMES)
export const PENDING_STORES = [
  OFFLINE_STORE_NAMES.PENDING_VACCINATIONS,
  OFFLINE_STORE_NAMES.PENDING_CHECKINS,
  OFFLINE_STORE_NAMES.PENDING_TOKENS,
] as const;

export type PendingStoreName = (typeof PENDING_STORES)[number];

// API endpoint each pending store syncs to
export const STORE_API_MAP: Record<PendingStoreName, string> = {
  [OFFLINE_STORE_NAMES.PENDING_VACCINATIONS]: "/api/worker/vaccination/record",
  [OFFLINE_STORE_NAMES.PENDING_CHECKINS]:     "/api/worker/appointments",
  [OFFLINE_STORE_NAMES.PENDING_TOKENS]:       "/api/worker/queue/token",
} as const;

export const MAX_SYNC_RETRIES = 5 as const;
export const SW_CACHE_NAME    = "vcbd-centers-v1" as const;

// ── Date / Time ───────────────────────────────────────────────────────────────
export const DATE_FORMAT = "YYYY-MM-DD" as const;
export const DATETIME_FORMAT = "YYYY-MM-DD HH:mm" as const;
export const LOCALE = "en-BD" as const;
