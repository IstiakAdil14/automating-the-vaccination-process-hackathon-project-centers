"use client";

import { useEffect, useState } from "react";
import { X, User, Syringe, ClipboardList, Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ProfileData {
  profile: {
    id: string; name: string; email: string; phone: string;
    role: string; nidMasked: string | null; dob: string | null;
    isActive: boolean; createdAt: string; lastLogin: string | null;
  };
  vaccinationHistory: { id: string; patientName: string; vaccineType: string; doseNumber: number; batchNo: string; adminSite: string; createdAt: string }[];
  auditTrail: { id: string; action: string; resourceType: string; metadata: Record<string, unknown>; createdAt: string }[];
  recentShifts: { date: string; shift: string }[];
  centerHistory: { id: string; name: string; address: string; district: string; division: string }[];
}

type Tab = "overview" | "vaccinations" | "audit" | "centers";

interface Props {
  staffId: string | null;
  onClose: () => void;
}

export function StaffProfileDrawer({ staffId, onClose }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!staffId) { setData(null); return; }
    setLoading(true);
    setTab("overview");
    fetch(`/api/worker/staff/${staffId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [staffId]);

  const open = !!staffId;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-xl bg-card border-l border-border z-50 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Staff Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Profile summary */}
            <div className="px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-bold text-lg flex items-center justify-center shrink-0">
                  {data.profile.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{data.profile.name}</p>
                  <p className="text-sm text-muted-foreground">{data.profile.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      data.profile.role === "center_manager"
                        ? "bg-accent/20 text-accent"
                        : "bg-primary/20 text-primary"
                    )}>
                      {data.profile.role === "center_manager" ? "Manager" : "Staff"}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      data.profile.isActive ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    )}>
                      {data.profile.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0 px-6">
              {(["overview", "vaccinations", "audit", "centers"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors capitalize",
                    tab === t
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Phone", value: data.profile.phone || "—" },
                      { label: "NID", value: data.profile.nidMasked || "—" },
                      { label: "Date of Birth", value: data.profile.dob ? new Date(data.profile.dob).toLocaleDateString() : "—" },
                      { label: "Joined", value: new Date(data.profile.createdAt).toLocaleDateString() },
                      { label: "Last Login", value: data.profile.lastLogin ? new Date(data.profile.lastLogin).toLocaleString() : "Never" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {data.recentShifts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Shifts</p>
                      <div className="space-y-1">
                        {data.recentShifts.slice(0, 10).map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50">
                            <span className="text-foreground">{s.date}</span>
                            <span className="capitalize text-muted-foreground">{s.shift}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "vaccinations" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Last 50 vaccination records administered by this staff member</p>
                  {data.vaccinationHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No records found</p>
                  )}
                  {data.vaccinationHistory.map((v) => (
                    <div key={v.id} className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{v.patientName}</p>
                          <p className="text-xs text-muted-foreground">{v.vaccineType} · Dose {v.doseNumber} · {v.adminSite.replace("_", " ")}</p>
                          <p className="text-xs text-muted-foreground">Batch: {v.batchNo}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "audit" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Last 50 actions by this staff member</p>
                  {data.auditTrail.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No audit entries found</p>
                  )}
                  {data.auditTrail.map((a) => (
                    <div key={a.id} className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">{a.action.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground">{a.resourceType}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "centers" && (
                <div className="space-y-2">
                  {data.centerHistory.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                      <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.address}</p>
                        <p className="text-xs text-muted-foreground">{c.district}, {c.division}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
