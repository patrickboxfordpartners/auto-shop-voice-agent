"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppointmentsCard } from "@/components/dashboard/appointments-card";
import { InventoryCard } from "@/components/dashboard/inventory-card";
import { OrdersCard } from "@/components/dashboard/orders-card";
import { Calendar, Package, Truck, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const todaysAppointments = useQuery(api.appointments.getAppointmentsByDate, {
    date: today,
  });
  const lowStockParts = useQuery(api.parts.getPartsNeedingReorder);
  const pendingOrders = useQuery(api.orders.getPendingOrders);

  const appointmentCount = todaysAppointments?.length ?? 0;
  const lowStockCount = lowStockParts?.length ?? 0;
  const pendingOrderCount = pendingOrders?.length ?? 0;
  const completedCount =
    todaysAppointments?.filter((a) => a.status === "completed").length ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex flex-1 flex-col gap-6 p-6">
        {/* Stat cards row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Appointments"
            value={appointmentCount}
            icon={<Calendar className="h-4 w-4" />}
            description={`${completedCount} completed`}
          />
          <StatCard
            title="Low Inventory"
            value={lowStockCount}
            icon={<AlertTriangle className="h-4 w-4" />}
            description="Parts below minimum"
          />
          <StatCard
            title="Pending Orders"
            value={pendingOrderCount}
            icon={<Truck className="h-4 w-4" />}
            description="Awaiting delivery"
          />
          <StatCard
            title="Parts in Stock"
            value={
              lowStockParts !== undefined
                ? `${lowStockParts.length > 0 ? "Action needed" : "All stocked"}`
                : "..."
            }
            icon={<Package className="h-4 w-4" />}
            description="Inventory status"
          />
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <AppointmentsCard />
          </div>
          <div className="xl:col-span-1">
            <InventoryCard />
          </div>
          <div className="xl:col-span-1">
            <OrdersCard />
          </div>
        </div>
      </main>
    </div>
  );
}
