"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Plus, Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySchedule { open: string; close: string; closed: boolean; }
interface Override { date: string; open: string; close: string; closed: boolean; note?: string; }

export function OperatingHoursEditor() {
  const [week, setWeek] = useState<DaySchedule[]>(
    Array.from({ length: 7 }, () => ({ open: "08:00", close: "17:00", closed: false }))
  );
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/worker/settings/center")
      .then((r) => r.json())
      .then((d) => {
        if (d.center?.weekSchedule) setWeek(d.center.weekSchedule);
        if (d.center?.hoursOverrides) setOverrides(d.center.hoursOverrides);
      });
  }, []);

  function updateDay(idx: number, field: keyof DaySchedule, val: string | boolean) {
    setWeek((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: val } : d));
    setMsg("");
  }

  function addOverride() {
    setOverrides((prev) => [...prev, { date: "", open: "08:00", close: "17:00", closed: false, note: "" }]);
  }

  function updateOverride(idx: number, field: keyof Override, val: string | boolean) {
    setOverrides((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));
  }

  function removeOverride(idx: number) {
    setOverrides((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/worker/settings/hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekSchedule: week, hoursOverrides: overrides.filter((o) => o.date) }),
    });
    setMsg(res.ok ? "Hours saved" : "Save failed");
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Operating Hours</h2>
      </div>
      <div className="p-5 space-y-6">
        {/* Weekly schedule */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weekly Schedule</h3>
          <div className="space-y-2">
            {week.map((d, i) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                <span className="w-24 text-sm text-foreground font-medium">{DAYS[i]}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.closed}
                    onChange={(e) => updateDay(i, "closed", e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Closed</span>
                </label>
                {!d.closed && (
                  <>
                    <input
                      type="time"
                      value={d.open}
                      onChange={(e) => updateDay(i, "open", e.target.value)}
                      className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={d.close}
                      onChange={(e) => updateDay(i, "close", e.target.value)}
                      className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Holiday overrides */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Holiday / Special Hours</h3>
            <button
              onClick={addOverride}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {overrides.length === 0 && <p className="text-xs text-muted-foreground italic">No special hours configured</p>}
          <div className="space-y-2">
            {overrides.map((o, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap bg-muted/20 rounded-lg p-2">
                <input
                  type="date"
                  value={o.date}
                  onChange={(e) => updateOverride(i, "date", e.target.value)}
                  className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={o.closed}
                    onChange={(e) => updateOverride(i, "closed", e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Closed</span>
                </label>
                {!o.closed && (
                  <>
                    <input
                      type="time"
                      value={o.open}
                      onChange={(e) => updateOverride(i, "open", e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={o.close}
                      onChange={(e) => updateOverride(i, "close", e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </>
                )}
                <input
                  type="text"
                  value={o.note ?? ""}
                  onChange={(e) => updateOverride(i, "note", e.target.value)}
                  placeholder="Note (e.g. National Holiday)"
                  className="flex-1 min-w-[140px] bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={() => removeOverride(i)}
                  className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {msg && <p className={`text-xs ${msg.includes("fail") ? "text-danger" : "text-success"}`}>{msg}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Hours"}
        </button>
      </div>
    </div>
  );
}
