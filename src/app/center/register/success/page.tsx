"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RegisterSuccessPage() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "—";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl border border-border bg-card shadow-lg p-8 space-y-6 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-subtle mx-auto"
          >
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Application Submitted</h1>
            <p className="text-muted-foreground text-sm">
              Your vaccination center registration is under review.
            </p>
          </div>

          {/* Reference number */}
          <div className="rounded-xl border border-border bg-muted px-6 py-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Reference Number
            </p>
            <p className="text-xl font-mono font-semibold text-foreground">{ref}</p>
            <p className="text-xs text-muted-foreground">Save this for tracking your application</p>
          </div>

          {/* Timeline */}
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Application received</p>
                <p className="text-xs text-muted-foreground">Documents and details submitted successfully</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-warning-subtle flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Under review</p>
                <p className="text-xs text-muted-foreground">Estimated 48 hours — our team will verify your documents</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Decision via email</p>
                <p className="text-xs text-muted-foreground">You will receive approval or feedback at your registered email</p>
              </div>
            </div>
          </div>

          <Link href="/login">
            <Button variant="outline" size="md" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
