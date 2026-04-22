// types/index.ts
// UI-layer types for the Centers portal.
// Mongoose document interfaces live in lib/db/models — imported and re-exported here
// so components never need to import directly from lib/db.

export type {
  IUser,
  ICenter,
  IOperatingHours,
  IAppointment,
  IVaccinationRecord,
  AdminSite,
  IInventory,
  IQueueToken,
  IPatientInfo,
  IFraudAlert,
  IAuditLog,
  AuditAction,
  ResourceType,
  IStaffRequest,
  RequestType,
  RequestUrgency,
  ISyncQueue,
  SyncRecordType,
} from "@/lib/db";

export type { VaccineType, QueueStatus, AppointmentStatus, Role, ShiftType, FraudAlertType, FraudSeverity } from "@/lib/constants";

// ── Lean / serialized versions (for client components — no Mongoose Document) ─
// Use these in useState, Zustand stores, and API response types.

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "staff" | "supervisor";
  centerId: string;
}

export interface CenterSummary {
  id: string;
  name: string;
  address: string;
  status: "active" | "suspended" | "closed";
  capacity: number;
  isOpen: boolean;
}

export interface QueueEntryDTO {
  id: string;
  tokenNumber: number;
  patientName: string;
  patientPhone: string;
  vaccineType: string;
  status: string;
  isWalkIn: boolean;
  createdAt: string;
}

export interface InventoryDTO {
  id: string;
  vaccineType: string;
  quantity: number;
  batchNo: string;
  expiryDate: string;
  isLowStock: boolean;
  isCritical: boolean;
  daysUntilExpiry: number;
}

// ── Slots ─────────────────────────────────────────────────────────────────────
export interface VaccineAllocationDTO {
  vaccineType: string;
  quota: number;
}

export interface SlotConfigDTO {
  id: string;
  date: string; // "YYYY-MM-DD"
  totalCapacity: number;
  morningLimit: number;
  eveningLimit: number;
  walkinQuota: number;
  vaccineAllocations: VaccineAllocationDTO[];
  isBlocked: boolean;
  blockReason?: string;
  blockId?: string;
  booked: number;
}

// ── API response wrapper ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
