"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  /** When true, renders a textarea for the user to enter a reason */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconClass: "bg-danger-subtle text-danger",
    confirmClass: "bg-danger text-danger-foreground hover:bg-danger-hover",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "bg-warning-subtle text-warning",
    confirmClass: "bg-warning text-warning-foreground hover:bg-warning-hover",
  },
  info: {
    icon: Info,
    iconClass: "bg-primary-50 text-primary",
    confirmClass: "bg-primary text-primary-foreground hover:bg-primary-hover",
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter reason…",
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  function handleConfirm() {
    onConfirm(requireReason ? reason : undefined);
  }

  function handleClose() {
    setReason("");
    onClose();
  }

  const canConfirm = !requireReason || reason.trim().length >= 3;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                key="confirm-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                key="confirm-panel"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
                  "w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-6"
                )}
                role="alertdialog"
                aria-modal="true"
              >
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div className={cn("p-2.5 rounded-xl shrink-0", cfg.iconClass)}>
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-base font-semibold text-foreground">
                      {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {description}
                    </Dialog.Description>
                  </div>
                </div>

                {/* Optional reason input */}
                {requireReason && (
                  <div className="mt-4">
                    <label
                      htmlFor="confirm-reason"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      {reasonLabel}
                      <span className="text-danger ml-0.5" aria-hidden>*</span>
                    </label>
                    <textarea
                      id="confirm-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={reasonPlaceholder}
                      rows={3}
                      className={cn(
                        "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
                        "placeholder:text-muted-foreground resize-none",
                        "focus:outline-none focus:ring-2 focus:ring-ring"
                      )}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    {cancelLabel}
                  </Button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || !canConfirm}
                    className={cn(
                      "inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50",
                      cfg.confirmClass
                    )}
                  >
                    {loading && (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {confirmLabel}
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
