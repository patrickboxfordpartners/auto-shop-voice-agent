import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppointmentsCard } from "@/components/dashboard/appointments-card";
import type { Appointment } from "@/components/dashboard/appointments-card";
import { InventoryCard } from "@/components/dashboard/inventory-card";
import type { LowStockPart } from "@/components/dashboard/inventory-card";
import { OrdersCard } from "@/components/dashboard/orders-card";
import type { PendingOrder } from "@/components/dashboard/orders-card";
import { Calendar, AlertTriangle, Truck, Package } from "lucide-react";

/*
 * Demo data — replace with Convex real-time queries once you run
 * `npx convex dev` and wire up the ConvexProvider.
 */
const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    customerName: "Sarah Johnson",
    customerPhone: "555-0101",
    vehicleYear: 2018,
    vehicleMake: "Honda",
    vehicleModel: "Civic",
    serviceType: "oil_change",
    serviceDescription: "Oil change with filter replacement",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "09:00",
    status: "confirmed",
    estimatedDuration: 30,
  },
  {
    id: "2",
    customerName: "Marcus Chen",
    customerPhone: "555-0142",
    vehicleYear: 2020,
    vehicleMake: "Toyota",
    vehicleModel: "Camry",
    serviceType: "brake_service",
    serviceDescription: "Brake inspection and service",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "10:30",
    status: "scheduled",
    estimatedDuration: 90,
  },
  {
    id: "3",
    customerName: "Emily Rodriguez",
    customerPhone: "555-0189",
    vehicleYear: 2019,
    vehicleMake: "Ford",
    vehicleModel: "Escape",
    serviceType: "tire_rotation",
    serviceDescription: "Tire rotation and pressure check",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "13:00",
    status: "in_progress",
    estimatedDuration: 30,
  },
  {
    id: "4",
    customerName: "David Park",
    customerPhone: "555-0223",
    vehicleYear: 2021,
    vehicleMake: "Honda",
    vehicleModel: "CR-V",
    serviceType: "oil_change",
    serviceDescription: "Oil change with filter replacement",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "14:30",
    status: "scheduled",
    estimatedDuration: 30,
  },
];

const DEMO_LOW_STOCK: LowStockPart[] = [
  {
    id: "p1",
    partNumber: "HON-15400-PLM-A02",
    partName: "Honda Oil Filter",
    currentStock: 3,
    minStock: 10,
    maxStock: 50,
    retailPrice: 12.99,
  },
  {
    id: "p2",
    partNumber: "BRKPD-CER-F100",
    partName: "Ceramic Front Brake Pads",
    currentStock: 5,
    minStock: 8,
    maxStock: 40,
    retailPrice: 79.99,
  },
];

const DEMO_ORDERS: PendingOrder[] = [
  {
    id: "o1",
    orderNumber: "ORD-2026-A3K9F2",
    vendorName: "AutoZone Wholesale",
    itemCount: 2,
    totalCost: 784.7,
    status: "pending",
    orderDate: new Date().toISOString().split("T")[0],
    notes: "Auto-generated for low stock",
  },
  {
    id: "o2",
    orderNumber: "ORD-2026-B7M2R8",
    vendorName: "AutoZone Wholesale",
    itemCount: 1,
    totalCost: 139.8,
    status: "shipped",
    orderDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    notes: "Expected Feb 22",
  },
];

export default function DashboardPage() {
  const appointmentCount = DEMO_APPOINTMENTS.length;
  const lowStockCount = DEMO_LOW_STOCK.length;
  const pendingOrderCount = DEMO_ORDERS.length;
  const completedCount = DEMO_APPOINTMENTS.filter(
    (a) => a.status === "completed"
  ).length;

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
            value={lowStockCount > 0 ? "Action needed" : "All stocked"}
            icon={<Package className="h-4 w-4" />}
            description="Inventory status"
          />
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <AppointmentsCard appointments={DEMO_APPOINTMENTS} />
          </div>
          <div className="xl:col-span-1">
            <InventoryCard parts={DEMO_LOW_STOCK} />
          </div>
          <div className="xl:col-span-1">
            <OrdersCard orders={DEMO_ORDERS} />
          </div>
        </div>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Showing demo data. Connect Convex to enable real-time updates from the
          voice agent.
        </p>
      </main>
    </div>
  );
}
