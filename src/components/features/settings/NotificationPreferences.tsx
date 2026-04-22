"use client";

import { useState, useEffect } from "react";
import { Bell, Save } from "lucide-react";

interface Prefs {
  newBooking: boolean;
  cancellation: boolean;
  lowStock: boolean;
  fraud: boolean;
  shiftReminder: boolean;
}

const PREF_LABELS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "newBooking",    label: "New Booking",      desc: "Email when a citizen books an appointment at this center" },
  { key: "cancellation",  label: "Cancellation",     desc: "Email when an appointment is cancelled" },
  { key: "lowStock",      label: "Low Stock Alert",  desc: "Email when any vaccine stock falls below threshold" },
  { key: "fraud",         label: "Fraud Alert",      desc: "Email when a fraud alert is raised at this center" },
  { key: "shiftReminder", label: "Shift Reminder",   desc: "Email staff 1 hour before their shift starts" },
];

const DEFAULT: Prefs = { newBooking: true, cancellation: true, lowStock: true, fraud: true, shiftReminder: false };

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/worker/settings/center")
      .then((r) => r.json())
      .then((d) => { if (d.center?.notificationPrefs) setPrefs(d.center.notificationPrefs); });
  }, []);

  function toggle(key: keyof Prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setMsg("");
  }

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/worker/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setMsg(res.ok ? "Preferences saved" : "Save failed");
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Bell className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Notification Preferences</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          {PREF_LABELS.map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={() => toggle(key)}
                  className="accent-primary w-4 h-4"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {msg && <p className={`text-xs ${msg.includes("fail") ? "text-danger" : "text-success"}`}>{msg}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
