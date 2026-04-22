"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ShieldAlert, AlertTriangle, Fingerprint, QrCode, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FraudAlertRow {
  id: string;
  type: string;
  severity: string;
  status: string;
  patientNidMasked: string | null;
  staffName: string | null;
  staffEmail: string | null;
  context: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  duplicate_record:  { label: "Duplicate NID Submission",       icon: Fingerprint, desc: "Same NID submitted for duplicate vaccination record" },
  qr_tamper:         { label: "Invalid QR Code Scan",           icon: QrCode,      desc: "QR code hash mismatch or tampered passport detected" },
  excess_doses:      { label: "Same-Dose Repeat Attempt",       icon: Activity,    desc: "Citizen attempting same vaccine dose more than once" },
  identity_mismatch: { label: "Identity Mismatch on Check-in",  icon: Fingerprint, desc: "NID/birth cert does not match appointment record" },
  suspicious_volume: { label: "Suspicious Volume",              icon: AlertTriangle, desc: "Abnormally high vaccination count in short window" },
};

const SEV_STYLE: Record<string, string> = {
  low:      "bg-muted text-muted-foreground",
  medium:   "bg-warning/20 text-warning",
  high:     "bg-danger/20 text-danger",
  critical: "bg-danger text-white",
};

const STATUS_STYLE: Record<string, string> = {
  open:          "bg-danger/20 text-danger",
  investigating: "bg-warning/20 text-warning",
  resolved:      "bg-success/20 text-success",
  dismissed:     "bg-muted text-muted-foreground",
};

interface Props {
  onInvestigate: (alert: FraudAlertRow) => void;
}

export function FraudAlertList({ onInvestigate }: Props) {
  const [alerts, setAlerts] = useState<FraudAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const esRef = useRef<EventSource | null>(null);

  const fetchAlerts = useCallback(async (status = statusFilter) => {
    setLoading(true);
    const res = await fetch(`/api/worker/fraud/alerts?status=${status}`);
    if (res.ok) setAlerts((await res.json()).alerts);
    setLoading(false);
  }, [statusFilter]);

  // SSE for live new alerts
  useEffect(() => {
    const es = new EventSource("/api/worker/fraud/stream");
    esRef.current = es;
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_alert") {
          setAlerts((prev) => {
            // Only prepend if matches current filter
            if (statusFilter !== "open" && statusFilter !== "") return prev;
            return [{ ...msg.alert, status: "open", staffName: null, staffEmail: null, patientNidMasked: msg.alert.patientNid ? msg.alert.patientNid.slice(0, 3) + "****" + msg.alert.patientNid.slice(-2) : null, resolvedAt: null }, ...prev];
          });
        }
      } catch { /* ignore */ }
    };
    return () => { es.close(); };
  }, [statusFilter]);

  useEffect(() => { fetchAlerts(statusFilter); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-danger" />
          <h2 className="font-semibold text-foreground text-sm">Fraud Alerts</h2>
          <span className="flex items-center gap-1 ml-1">
            <span className={cn("w-2 h-2 rounded-full", live ? "bg-accent animate-pulse-slow" : "bg-muted-foreground")} />
            <span className="text-xs text-muted-foreground">{live ? "Live" : "Connecting…"}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {["open", "investigating", "resolved", "dismissed", ""].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  statusFilter === s ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/30"
                )}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchAlerts(statusFilter)}
            disabled={loading}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/30 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border/50 max-h-[520px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <ShieldAlert className="w-8 h-8 opacity-30" />
            <p className="text-sm">No alerts found</p>
          </div>
        )}
        {!loading && alerts.map((alert) => {
          const meta = TYPE_META[alert.type] ?? { label: alert.type, icon: AlertTriangle, desc: "" };
          const Icon = meta.icon;
          return (
            <div key={alert.id} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/10 transition-colors">
              <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SEV_STYLE[alert.severity])}>
                    {alert.severity}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_STYLE[alert.status])}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {alert.patientNidMasked && <span>Patient NID: {alert.patientNidMasked}</span>}
                  {alert.staffName && <span>Staff: {alert.staffName}</span>}
                  <span>{new Date(alert.createdAt).toLocaleString("en-BD")}</span>
                </div>
              </div>
              <button
                onClick={() => onInvestigate(alert)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-colors font-medium"
              >
                Investigate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
