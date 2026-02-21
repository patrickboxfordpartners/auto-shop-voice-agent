"use client";

import { AlertTriangle, Package, CheckCircle2 } from "lucide-react";

export interface LowStockPart {
  id: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  retailPrice: number;
}

interface InventoryCardProps {
  parts: LowStockPart[];
}

export function InventoryCard({ parts }: InventoryCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-card-foreground">
            Low Inventory Alerts
          </h2>
        </div>
        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
          {parts.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm">All parts are stocked</p>
          </div>
        ) : (
          parts.map((part) => {
            const stockPercent = Math.round(
              (part.currentStock / part.maxStock) * 100
            );
            const isVeryLow =
              part.currentStock <= Math.floor(part.minStock / 2);

            return (
              <div
                key={part.id}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Package className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-card-foreground">
                      {part.partName}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        isVeryLow ? "text-destructive" : "text-amber-400"
                      }`}
                    >
                      {part.currentStock} / {part.maxStock}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isVeryLow ? "bg-destructive" : "bg-amber-400"
                        }`}
                        style={{ width: `${Math.max(stockPercent, 3)}%` }}
                        role="progressbar"
                        aria-valuenow={part.currentStock}
                        aria-valuemin={0}
                        aria-valuemax={part.maxStock}
                        aria-label={`${part.partName} stock level`}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {part.partNumber}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
