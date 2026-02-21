"use client";

import { Truck, CheckCircle2, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingOrder {
  id: string;
  orderNumber: string;
  vendorName: string;
  itemCount: number;
  totalCost: number;
  status: string;
  orderDate: string;
  notes?: string;
}

const orderStatusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  submitted: "bg-primary/10 text-primary",
  confirmed: "bg-primary/10 text-primary",
  shipped: "bg-emerald-500/10 text-emerald-400",
};

const orderStatusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  submitted: Package,
  confirmed: Package,
  shipped: Truck,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

interface OrdersCardProps {
  orders: PendingOrder[];
}

export function OrdersCard({ orders }: OrdersCardProps) {
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
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm">No pending orders</p>
          </div>
        ) : (
          orders.map((order) => {
            const StatusIcon =
              orderStatusIcons[order.status] || Clock;
            return (
              <div
                key={order.id}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <StatusIcon className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm font-medium text-card-foreground">
                        {order.orderNumber}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          orderStatusStyles[order.status] ||
                            orderStatusStyles.pending
                        )}
                      >
                        {order.status}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-card-foreground">
                      {formatCurrency(order.totalCost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{order.vendorName}</span>
                    <span>
                      {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </span>
                    {order.notes && (
                      <span className="truncate">{order.notes}</span>
                    )}
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
