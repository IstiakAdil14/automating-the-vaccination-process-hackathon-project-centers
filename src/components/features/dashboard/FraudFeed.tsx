"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertTriangle, Fingerprint, QrCode, Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FraudAlert {
  id: string;
  type: string;
  severity: string;
  patientNid: string | null;
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  duplicate_record: { label: "Duplicate Record", icon: Fingerprint },
  qr_tamper: { label: "QR Tamper", icon: QrCode },
  excess_doses: { label: "Excess Doses", icon: Activity },
  identity_mismatch: { label: "Identity Mismatch", icon: Fingerprint },
  suspicious_volume: { label: "Suspicious Volume", icon: AlertTriangle },
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning-subtle text-warning-foreground",
  high: "bg-danger-subtle text-danger-foreground",
  critical: "bg-danger text-white",
};

export function FraudFeed() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/worker/fraud/stream");
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "initial") {
          setAlerts(msg.alerts);
          setConnected(true);
        } else if (msg.type === "new_alert") {
          setAlerts((prev) => [msg.alert, ...prev].slice(0, 30));
        }
      } catch { /* ignore parse errors */ }
    };

    return () => { es.close(); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-danger" />
          <h2 className="font-semibold text-foreground text-sm">Fraud Alerts</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full", connected ? "bg-accent animate-pulse-slow" : "bg-muted-foreground")} />
          <span className="text-xs text-muted-foreground">{connected ? "Live" : "Connecting…"}</span>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-border">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <ShieldAlert className="w-8 h-8 opacity-30" />
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const meta = TYPE_META[alert.type] ?? { label: alert.type, icon: AlertTriangle };
              const Icon = meta.icon;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 px-5 py-3"
                >
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-danger-subtle flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{meta.label}</span>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", SEVERITY_STYLES[alert.severity])}>
                        {alert.severity}
                      </span>
                    </div>
                    {alert.patientNid && (
                      <p className="text-xs text-muted-foreground mt-0.5">NID: {alert.patientNid}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
