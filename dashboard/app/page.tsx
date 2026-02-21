"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  received: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function Chip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ?? "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const appointments = useQuery(api.appointments.getTodaysAppointments);
  const partsToReorder = useQuery(api.parts.getPartsNeedingReorder);
  const pendingOrders = useQuery(api.orders.getOrdersByStatus, {
    status: "pending",
  });

  const loading =
    appointments === undefined ||
    partsToReorder === undefined ||
    pendingOrders === undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Precision Auto Shop
            </h1>
            <p className="text-sm text-gray-500">{today}</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Live
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Today's Appointments"
            value={loading ? "—" : appointments.length}
            sub="scheduled for today"
          />
          <StatCard
            title="Parts to Reorder"
            value={loading ? "—" : partsToReorder.length}
            sub="at or below minimum stock"
            accent={
              !loading && partsToReorder.length > 0
                ? "text-amber-600"
                : undefined
            }
          />
          <StatCard
            title="Pending Orders"
            value={loading ? "—" : pendingOrders.length}
            sub="awaiting submission"
            accent={
              !loading && pendingOrders.length > 0
                ? "text-blue-600"
                : undefined
            }
          />
        </div>

        {/* Today's Schedule */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Today&apos;s Schedule
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-6 text-sm text-gray-400">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">
                No appointments scheduled for today.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {["Time", "Customer", "Vehicle", "Service", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments
                    .slice()
                    .sort((a, b) =>
                      a.scheduledTime.localeCompare(b.scheduledTime)
                    )
                    .map((apt) => (
                      <tr key={apt._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {formatTime(apt.scheduledTime)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {apt.customerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {apt.customerPhone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {apt.vehicleYear} {apt.vehicleMake} {apt.vehicleModel}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {apt.serviceDescription}
                          {apt.diagnosticNotes && (
                            <div
                              className="mt-0.5 max-w-xs truncate text-xs text-gray-400"
                              title={apt.diagnosticNotes}
                            >
                              {apt.diagnosticNotes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            label={apt.status}
                            colorClass={
                              STATUS_COLORS[apt.status] ??
                              "bg-gray-100 text-gray-700"
                            }
                          />
                          {apt.enrichmentStatus === "pending" && (
                            <div className="mt-1 text-xs text-purple-500">
                              Parts lookup in progress…
                            </div>
                          )}
                          {apt.enrichmentStatus === "complete" && (
                            <div className="mt-1 text-xs text-green-600">
                              Parts enriched ({apt.partsEnrichment?.length ?? 0})
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Parts to Reorder */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Parts to Reorder
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {loading ? (
                <div className="p-6 text-sm text-gray-400">Loading...</div>
              ) : partsToReorder.length === 0 ? (
                <div className="p-6 text-sm text-gray-400">
                  All parts are sufficiently stocked.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      {["Part", "Stock", "Min", "Unit Cost"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partsToReorder.map((part) => (
                      <tr key={part._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {part.partName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {part.partNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-amber-600">
                            {part.currentStock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {part.minStock}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatCurrency(part.unitCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Pending Orders */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Pending Orders
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {loading ? (
                <div className="p-6 text-sm text-gray-400">Loading...</div>
              ) : pendingOrders.length === 0 ? (
                <div className="p-6 text-sm text-gray-400">
                  No pending orders.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      {["Order #", "Items", "Total", "Date", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "item" : "items"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(order.totalCost)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            label={order.status}
                            colorClass={
                              ORDER_STATUS_COLORS[order.status] ??
                              "bg-gray-100 text-gray-700"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
