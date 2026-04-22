"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StockDashboard } from "./StockDashboard";
import { ReceiveStockDrawer } from "./ReceiveStockDrawer";
import { TransactionLog } from "./TransactionLog";
import { ExpiryTable } from "./ExpiryTable";
import { LowStockAlerts } from "./LowStockAlerts";
import { RestockRequestDrawer } from "./RestockRequestDrawer";
import { VACCINE_TYPES } from "@/lib/constants";
import type { VaccineType } from "@/lib/constants";

export interface StockCard {
  vaccineType: VaccineType;
  totalQty: number;
  dosesThisMonth: number;
  daysRemaining: number | null;
  nearestExpiry: string | null;
  nearestExpiryBatch: string;
  threshold: number;
  status: "green" | "amber" | "red";
}

export interface ExpiryBatch {
  id: string;
  vaccineType: string;
  batchNo: string;
  lotNo: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export interface Transaction {
  id: string;
  timestamp: string;
  action: string;
  vaccineType: string;
  quantityChange: number;
  batchNo: string;
  staffName: string;
  notes: string;
}

interface InventoryData {
  stockCards: StockCard[];
  expiryBatches: ExpiryBatch[];
  transactions: Transaction[];
  txTotal: number;
  txPage: number;
  txTotalPages: number;
}

export function InventoryClient() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [filterVaccine, setFilterVaccine] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockVaccine, setRestockVaccine] = useState<VaccineType | "">("");

  const fetchData = useCallback(async (page = txPage) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterVaccine) params.set("vaccine", filterVaccine);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    const res = await fetch(`/api/worker/inventory?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [txPage, filterVaccine, filterFrom, filterTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openRestock(vaccineType?: VaccineType) {
    setRestockVaccine(vaccineType ?? "");
    setRestockOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vaccine stock tracking, expiry monitoring, and restock requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => openRestock()}>
            Request Restock
          </Button>
          <Button size="sm" onClick={() => setReceiveOpen(true)}>
            Receive Stock
          </Button>
        </div>
      </div>

      {/* Low stock alerts */}
      {data && (
        <LowStockAlerts
          cards={data.stockCards}
          onRestock={(vt) => openRestock(vt)}
          onThresholdSaved={() => fetchData()}
        />
      )}

      {/* Stock dashboard cards */}
      <StockDashboard cards={data?.stockCards ?? []} loading={loading} />

      {/* Expiry tracking */}
      <ExpiryTable
        batches={data?.expiryBatches ?? []}
        loading={loading}
        onWastageReported={() => fetchData()}
      />

      {/* Transaction log */}
      <TransactionLog
        transactions={data?.transactions ?? []}
        total={data?.txTotal ?? 0}
        page={data?.txPage ?? 1}
        totalPages={data?.txTotalPages ?? 1}
        loading={loading}
        filterVaccine={filterVaccine}
        filterFrom={filterFrom}
        filterTo={filterTo}
        onFilterVaccine={(v) => { setFilterVaccine(v); setTxPage(1); }}
        onFilterFrom={(v) => { setFilterFrom(v); setTxPage(1); }}
        onFilterTo={(v) => { setFilterTo(v); setTxPage(1); }}
        onPageChange={(p) => setTxPage(p)}
        vaccineTypes={[...VACCINE_TYPES]}
      />

      {/* Drawers */}
      <ReceiveStockDrawer
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        onSuccess={() => { setReceiveOpen(false); fetchData(); }}
      />
      <RestockRequestDrawer
        open={restockOpen}
        initialVaccine={restockVaccine}
        onClose={() => setRestockOpen(false)}
        onSuccess={() => { setRestockOpen(false); fetchData(); }}
      />
    </div>
  );
}
