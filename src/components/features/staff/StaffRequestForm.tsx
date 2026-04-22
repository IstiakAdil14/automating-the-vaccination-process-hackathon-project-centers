"use client";

import { useState, useEffect } from "react";
import { Send, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StaffRequestItem {
  id: string;
  requestType: string;
  reason: string;
  urgency: string;
  status: string;
  requestedBy: string;
  reviewNote: string | null;
  createdAt: string;
}

const REQUEST_TYPES = [
  { value: "extra_staff", label: "New staff needed" },
  { value: "schedule_change", label: "Transfer request" },
  { value: "other", label: "Remove staff" },
] as const;

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-warning" />,
  approved: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-danger" />,
  in_progress: <AlertCircle className="w-3.5 h-3.5 text-accent" />,
  completed: <CheckCircle className="w-3.5 h-3.5 text-success" />,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-danger/20 text-danger",
  in_progress: "bg-accent/20 text-accent",
  completed: "bg-success/20 text-success",
};

export function StaffRequestForm() {
  const [requests, setRequests] = useState<StaffRequestItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    requestType: "extra_staff" as string,
    preferredRole: "",
    reason: "",
    urgency: "normal" as string,
  });

  async function fetchRequests() {
    setLoadingList(true);
    const res = await fetch("/api/worker/staff/requests");
    if (res.ok) setRequests((await res.json()).requests);
    setLoadingList(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    const res = await fetch("/api/worker/staff/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSuccess(true);
      setForm({ requestType: "extra_staff", preferredRole: "", reason: "", urgency: "normal" });
      fetchRequests();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit request");
    }
    setSubmitting(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Submit Staff Request to Admin</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Request new staff, transfers, or removals</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Request Type</label>
            <select
              value={form.requestType}
              onChange={(e) => setForm((f) => ({ ...f, requestType: e.target.value }))}
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Preferred Role (optional)</label>
            <input
              type="text"
              value={form.preferredRole}
              onChange={(e) => setForm((f) => ({ ...f, preferredRole: e.target.value }))}
              placeholder="e.g. Nurse, Vaccination Officer"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason <span className="text-danger">*</span></label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={3}
              required
              minLength={10}
              placeholder="Describe the reason for this request..."
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Urgency</label>
            <div className="flex gap-2">
              {URGENCY_OPTIONS.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, urgency: u.value }))}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    form.urgency === u.value
                      ? "bg-primary text-white border-primary"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">Request submitted successfully!</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>

      {/* Submitted requests */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Submitted Requests</h3>
        </div>
        <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
          {loadingList && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loadingList && requests.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No requests submitted yet</div>
          )}
          {requests.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {REQUEST_TYPES.find((t) => t.value === r.requestType)?.label ?? r.requestType}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground")}>
                      {STATUS_ICON[r.status]}
                      {r.status.replace("_", " ")}
                    </span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-medium",
                      r.urgency === "critical" ? "bg-danger/20 text-danger" :
                      r.urgency === "high" ? "bg-warning/20 text-warning" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {r.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.reason}</p>
                  {r.reviewNote && (
                    <p className="text-xs text-accent mt-1">Admin note: {r.reviewNote}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
