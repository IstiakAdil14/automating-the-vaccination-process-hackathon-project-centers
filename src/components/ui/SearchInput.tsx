"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  /** Show CMD+K shortcut hint */
  showShortcut?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = "Search…",
  debounceMs = 300,
  loading = false,
  showShortcut = true,
  className,
  inputClassName,
  autoFocus,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localValue, setLocalValue] = useState(controlledValue ?? "");

  // Sync controlled value → local
  useEffect(() => {
    if (controlledValue !== undefined) setLocalValue(controlledValue);
  }, [controlledValue]);

  // Debounced emit
  const emit = useCallback(
    (val: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), debounceMs);
    },
    [onChange, debounceMs]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalValue(e.target.value);
    emit(e.target.value);
  }

  function handleClear() {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
    inputRef.current?.focus();
  }

  // CMD+K / CTRL+K global shortcut
  useEffect(() => {
    if (!showShortcut) return;
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showShortcut]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Leading icon */}
      <div className="absolute left-3 pointer-events-none">
        {loading
          ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" aria-hidden />
          : <Search className="w-4 h-4 text-muted-foreground" aria-hidden />
        }
      </div>

      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-background",
          "pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
          "transition-colors",
          inputClassName
        )}
      />

      {/* Trailing: clear button or shortcut hint */}
      <div className="absolute right-3 flex items-center gap-1.5">
        {localValue ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : showShortcut ? (
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground font-mono select-none"
            aria-hidden
          >
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        ) : null}
      </div>
    </div>
  );
}
