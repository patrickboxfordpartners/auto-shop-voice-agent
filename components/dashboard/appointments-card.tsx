"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Calendar,
  Car,
  Clock,
  Wrench,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  scheduled:
    "bg-primary/10 text-primary border border-primary/20",
  confirmed:
    "bg-primary/15 text-primary border border-primary/30",
  in_progress:
    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  completed:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  cancelled:
    "bg-destructive/10 text-destructive border border-destructive/20",
};

const serviceIcons: Record<string, typeof Wrench> = {
  oil_change: Wrench,
  brake_service: Wrench,
  tire_rotation: Car,
  tire_replacement: Car,
  general_service: Wrench,
};

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatServiceType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AppointmentsCard() {
  const today = new Date().toISOString().split("T")[0];
  const appointments = useQuery(api.appointments.getAppointmentsByDate, {
    date: today,
  });

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-card-foreground">
            {"Today's Appointments"}
          </h2>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {appointments === undefined ? "..." : appointments.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {appointments === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm">No appointments today</p>
          </div>
        ) : (
          appointments.map((apt) => {
            const ServiceIcon =
              serviceIcons[apt.serviceType] || Wrench;
            return (
              <div
                key={apt._id}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <ServiceIcon className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-card-foreground">
                      {apt.customerName}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        statusStyles[apt.status] || statusStyles.scheduled
                      )}
                    >
                      {apt.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {apt.vehicleYear} {apt.vehicleMake} {apt.vehicleModel}
                    </span>
                    <span>{formatServiceType(apt.serviceType)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(apt.scheduledTime)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
