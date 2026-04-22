"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Printer, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VACCINE_TYPES } from "@/lib/constants";

interface FormData {
  name: string;
  phone: string;
  vaccineType: string;
}

interface GeneratedToken {
  id: string;
  tokenNumber: number;
  patientName: string;
  vaccineType: string;
  date: string;
}

export function TokenForm() {
  const [token, setToken] = useState<GeneratedToken | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/worker/queue/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const result = await res.json();
    setToken(result);
    reset();
  };

  const printSlip = () => window.print();

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">Walk-in Token</h2>
      </div>

      <div className="p-5 space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Input
              placeholder="Patient name"
              {...register("name", { required: true })}
              error={!!errors.name}
            />
          </div>
          <div>
            <Input
              placeholder="Phone number"
              type="tel"
              {...register("phone", { required: true })}
              error={!!errors.phone}
            />
          </div>
          <div>
            <select
              {...register("vaccineType", { required: true })}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select vaccine type</option>
              {VACCINE_TYPES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Generate Token
          </Button>
        </form>

        {token && (
          <>
            {/* Token slip — printable */}
            <div
              id="token-slip"
              className="border-2 border-dashed border-primary/40 rounded-xl p-5 text-center bg-primary/5 print:border-black print:bg-white"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                VaccinationBD — Token Slip
              </p>
              <div className="text-6xl font-black text-primary my-3">
                #{String(token.tokenNumber).padStart(3, "0")}
              </div>
              <p className="font-semibold text-foreground">{token.patientName}</p>
              <p className="text-sm text-muted-foreground mt-1">{token.vaccineType}</p>
              <p className="text-xs text-muted-foreground mt-2">{token.date}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={printSlip}>
              <Printer className="w-4 h-4" />
              Print Slip
            </Button>
          </>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #token-slip { display: block !important; position: fixed; inset: 0; }
        }
      `}</style>
    </div>
  );
}
