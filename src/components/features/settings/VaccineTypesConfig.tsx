"use client";

import { useState, useEffect } from "react";
import { Syringe, Save, AlertCircle } from "lucide-react";
import { VACCINE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

export function VaccineTypesConfig() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/worker/settings/center")
      .then((r) => r.json())
      .then((d) => setSelected(new Set(d.center?.vaccines ?? [])));
  }, []);

  function toggle(vt: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(vt) ? next.delete(vt) : next.add(vt);
      return next;
    });
    setMsg("");
  }

  async function save() {
    if (selected.size === 0) { setMsg("Select at least one vaccine"); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/worker/settings/vaccines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaccines: [...selected] }),
    });
    setMsg(res.ok ? "Vaccine list saved" : "Save failed");
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Syringe className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Vaccine Types Offered</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            Unchecking a vaccine removes it from citizen booking immediately. Existing appointments are not affected.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VACCINE_TYPES.map((vt) => {
            const on = selected.has(vt);
            return (
              <button
                key={vt}
                onClick={() => toggle(vt)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                  on
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/20 border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  on ? "bg-primary border-primary" : "border-muted-foreground"
                )}>
                  {on && <span className="w-2 h-2 bg-white rounded-sm" />}
                </span>
                {vt}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{selected.size} of {VACCINE_TYPES.length} vaccines selected</p>

        {msg && <p className={`text-xs ${msg.includes("fail") || msg.includes("least") ? "text-danger" : "text-success"}`}>{msg}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Vaccine List"}
        </button>
      </div>
    </div>
  );
}
