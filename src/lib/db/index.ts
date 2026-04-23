// lib/db/index.ts
// Single import point for all Mongoose models and the DB connection.
// Usage: import { connectDB, User, Center, Appointment, ... } from "@/lib/db"
//
// IMPORTANT: Always call `await connectDB()` at the top of every API route
// before accessing any model. The singleton ensures only one connection is made.

export { connectDB, getConnectionState } from "./mongoose";

// ── Models ────────────────────────────────────────────────────────────────────
export { User }              from "./models/User";
export { Center }            from "./models/Center";
export { Appointment }       from "./models/Appointment";
export { VaccinationRecord } from "./models/VaccinationRecord";
export { Inventory }         from "./models/Inventory";
export { QueueToken }        from "./models/QueueToken";
export { FraudAlert }        from "./models/FraudAlert";
export { AuditLog }          from "./models/AuditLog";
export { Staff }                  from "./models/Staff";
export { CenterApplication }      from "./models/CenterApplication";
export { StaffRequest }      from "./models/StaffRequest";
export { SyncQueue }         from "./models/SyncQueue";
export { SlotConfig }        from "./models/SlotConfig";
export { ShiftAssignment }   from "./models/ShiftAssignment";
export { PushSubscription }  from "./models/PushSubscription";

// ── TypeScript interfaces (re-exported for use in API routes / components) ────
export type { IUser }              from "./models/User";
export type { ICenter, IOperatingHours } from "./models/Center";
export type { IAppointment }       from "./models/Appointment";
export type { IVaccinationRecord, AdminSite } from "./models/VaccinationRecord";
export type { IInventory }         from "./models/Inventory";
export type { IQueueToken, IPatientInfo } from "./models/QueueToken";
export type { IFraudAlert }        from "./models/FraudAlert";
export type { IAuditLog, AuditAction, ResourceType } from "./models/AuditLog";
export type { IStaff }                  from "./models/Staff";
export type { ICenterApplication }      from "./models/CenterApplication";
export type { IStaffRequest, RequestType, RequestUrgency } from "./models/StaffRequest";
export type { ISyncQueue, SyncRecordType } from "./models/SyncQueue";
export type { ISlotConfig, IVaccineAllocation } from "./models/SlotConfig";
export type { IShiftAssignment } from "./models/ShiftAssignment";
export type { IPushSubscription } from "./models/PushSubscription";
