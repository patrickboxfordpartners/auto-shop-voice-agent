"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Truck, Loader2, CheckCircle2 } from "lucide-react";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function OrdersCard() {
  const pendingOrders = useQuery(api.orders.getPendingOrders);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-card-foreground">
            Pending Orders
          </h2>
        </div>
        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
          {pendingOrders === undefined ? "..." : pendingOrders.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {pendingOrders === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm">No pending orders</p>
          </div>
        ) : (
          pendingOrders.map((order) => (
            <div
              key={order._id}
              className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Truck className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="truncate font-mono text-sm font-medium text-card-foreground">
                    {order.orderNumber}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-card-foreground">
                    {formatCurrency(order.totalCost)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </span>
                  <span>{formatDate(order.orderDate)}</span>
                  {order.notes && (
                    <span className="truncate">{order.notes}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
