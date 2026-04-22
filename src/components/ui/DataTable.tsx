"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

// ── Column definition API ─────────────────────────────────────────────────────
export interface ColumnDef<T> {
  key: string;
  header: string;
  /** Render cell content. Receives the row and the raw value. */
  cell?: (row: T) => React.ReactNode;
  /** Set to true to enable client-side sorting on this column */
  sortable?: boolean;
  /** Accessor for sort/filter — defaults to key */
  accessor?: (row: T) => string | number | Date | null | undefined;
  className?: string;
  headerClassName?: string;
  /** Hide on small screens */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  /** Number of skeleton rows shown while loading */
  skeletonRows?: number;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Controlled pagination — omit for client-side */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  /** Total record count for display */
  total?: number;
  className?: string;
  rowClassName?: (row: T) => string;
}

type SortDir = "asc" | "desc" | null;

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc")  return <ChevronUp   className="w-3.5 h-3.5 text-primary" />;
  if (dir === "desc") return <ChevronDown  className="w-3.5 h-3.5 text-primary" />;
  return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3.5 rounded bg-muted animate-shimmer"
            style={{
              width: `${55 + (i * 17) % 35}%`,
              backgroundImage: "linear-gradient(90deg, var(--muted) 25%, var(--surface-raised) 50%, var(--muted) 75%)",
              backgroundSize: "200% 100%",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  loading = false,
  skeletonRows = 8,
  emptyMessage = "No records found",
  emptyIcon,
  onRowClick,
  page,
  totalPages,
  onPageChange,
  total,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey]   = useState<string | null>(null);
  const [sortDir, setSortDir]   = useState<SortDir>(null);

  // ── Client-side sort (only when no server pagination) ─────────────────────
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir || page !== undefined) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const get = col.accessor ?? ((row: T) => row[sortKey] as string | number);
    return [...data].sort((a, b) => {
      const av = get(a) ?? "";
      const bv = get(b) ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns, page]);

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortable) return;
    if (sortKey !== col.key) { setSortKey(col.key); setSortDir("asc"); return; }
    if (sortDir === "asc")   { setSortDir("desc"); return; }
    setSortKey(null); setSortDir(null);
  }

  const isControlled = page !== undefined && onPageChange !== undefined;
  const showPagination = isControlled && totalPages !== undefined && totalPages > 1;

  return (
    <div className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => handleSort(col)}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap select-none",
                    col.sortable && "cursor-pointer hover:text-foreground transition-colors",
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.headerClassName
                  )}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc" ? "ascending" : "descending"
                      : "none"
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading skeleton */}
            {loading && data.length === 0 &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            }

            {/* Empty state */}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    {emptyIcon ?? <Inbox className="w-10 h-10 opacity-30" />}
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            <AnimatePresence initial={false}>
              {sorted.map((row, idx) => (
                <motion.tr
                  key={String(row[keyField])}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border/60 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/30",
                    rowClassName?.(row)
                  )}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5",
                        col.hideOnMobile && "hidden sm:table-cell",
                        col.className
                      )}
                    >
                      {col.cell
                        ? col.cell(row)
                        : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {total !== undefined
              ? `${total.toLocaleString()} total · Page ${page} of ${totalPages}`
              : `Page ${page} of ${totalPages}`}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page! <= 1 || loading}
              onClick={() => onPageChange!(page! - 1)}
              aria-label="Previous page"
            >
              Prev
            </Button>
            {/* Page number pills — show up to 5 around current */}
            {Array.from({ length: totalPages! }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page!) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => onPageChange!(p)}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-medium transition-colors",
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page! >= totalPages! || loading}
              onClick={() => onPageChange!(page! + 1)}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
