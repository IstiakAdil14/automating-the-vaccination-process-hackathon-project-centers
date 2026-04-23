"use client";

import { useState, useEffect } from "react";
import { Save, Building2 } from "lucide-react";

interface CenterInfo {
  name: string; phone: string; email: string; address: string;
  division: string; district: string; capacity: number; status: string; photoUrl?: string;
}

interface Props { onPhotoChange: (url: string) => void; }

export function CenterInfoEditor({ onPhotoChange }: Props) {
  const [info, setInfo] = useState<CenterInfo | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/worker/settings/center")
      .then((r) => r.json())
      .then((d) => {
        if (!d.center) return;
        setInfo(d.center);
        setForm({
          name:    d.center.name    ?? "",
          phone:   d.center.phone   ?? "",
          email:   d.center.email   ?? "",
          address: d.center.address ?? "",
        });
      });
  }, []);

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/worker/settings/center", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centerName: form.name, phone: form.phone, email: form.email, address: form.address }),
    });
    setMsg(res.ok ? "Saved successfully" : "Save failed");
    setSaving(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch("/api/worker/settings/photo", { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      onPhotoChange(d.photoUrl);
      setMsg("Photo updated");
    } else {
      const d = await res.json();
      setMsg(d.error ?? "Upload failed");
    }
    setUploading(false);
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Building2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Center Information</h2>
      </div>
      <div className="p-5 space-y-4">
        {/* Read-only meta */}
        {info && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Division", value: info.division },
              { label: "District", value: info.district },
              { label: "Status", value: info.status },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/20 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground capitalize">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Center Name", "name")}
          {field("Phone", "phone", "tel")}
          {field("Email", "email", "email")}
          {field("Address", "address")}
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Center Photo</label>
          <div className="flex items-center gap-3">
            {info?.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.photoUrl} alt="Center" className="w-16 h-16 rounded-lg object-cover border border-border" />
            )}
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
              {uploading ? "Uploading…" : "Upload photo"}
            </label>
            <p className="text-xs text-muted-foreground">JPEG/PNG/WebP, max 2 MB</p>
          </div>
        </div>

        {msg && <p className={`text-xs ${msg.includes("fail") || msg.includes("error") ? "text-danger" : "text-success"}`}>{msg}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
