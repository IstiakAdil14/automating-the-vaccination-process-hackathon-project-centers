"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  /** Width of the drawer panel. Defaults to "md" (480px) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Slot rendered in the footer area */
  footer?: React.ReactNode;
  className?: string;
}

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-[480px]",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export function SideDrawer({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
  className,
}: SideDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                key="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              />
            </Dialog.Overlay>

            {/* Panel */}
            <Dialog.Content asChild>
              <motion.div
                key="drawer-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className={cn(
                  "fixed inset-y-0 right-0 z-50 flex flex-col",
                  "w-full bg-card shadow-xl border-l border-border",
                  SIZE_CLASS[size],
                  className
                )}
                aria-describedby={description ? "drawer-description" : undefined}
              >
                {/* Header */}
                {(title || description) && (
                  <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
                    <div>
                      {title && (
                        <Dialog.Title className="text-base font-semibold text-foreground">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description
                          id="drawer-description"
                          className="text-sm text-muted-foreground mt-0.5"
                        >
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label="Close drawer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 border-t border-border shrink-0 bg-muted/20">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
