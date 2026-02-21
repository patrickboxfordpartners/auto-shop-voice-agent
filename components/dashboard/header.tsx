"use client";

import { Wrench, Activity } from "lucide-react";

export function DashboardHeader() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex flex-col gap-1 border-b border-border bg-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Wrench className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-card-foreground">
            {"Mike's Auto Shop"}
          </h1>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <Activity className="h-3 w-3" />
          Live
        </span>
      </div>
    </header>
  );
}
