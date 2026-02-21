import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new appointment
export const createAppointment = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    vehicleYear: v.number(),
    vehicleMake: v.string(),
    vehicleModel: v.string(),
    serviceType: v.string(),
    serviceDescription: v.string(),
    estimatedDuration: v.number(),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
    partsNeeded: v.array(v.id("parts")),
    callRecordingUrl: v.optional(v.string()),
    callTranscript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointmentId = await ctx.db.insert("appointments", {
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      vehicleYear: args.vehicleYear,
      vehicleMake: args.vehicleMake,
      vehicleModel: args.vehicleModel,
      serviceType: args.serviceType,
      serviceDescription: args.serviceDescription,
      estimatedDuration: args.estimatedDuration,
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      status: "scheduled",
      partsNeeded: args.partsNeeded,
      callRecordingUrl: args.callRecordingUrl,
      callTranscript: args.callTranscript,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return appointmentId;
  },
});

// Get appointments for a specific date
export const getAppointmentsByDate = query({
  args: {
    date: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_scheduled_date", (q) => q.eq("scheduledDate", args.date))
      .collect();
  },
});

// Get today's appointments
export const getTodaysAppointments = query({
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    return await ctx.db
      .query("appointments")
      .withIndex("by_scheduled_date", (q) => q.eq("scheduledDate", today))
      .collect();
  },
});

// Get appointments by status
export const getAppointmentsByStatus = query({
  args: {
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Update appointment status
export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get customer's appointment history
export const getCustomerAppointments = query({
  args: {
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_customer_phone", (q) => q.eq("customerPhone", args.customerPhone))
      .collect();
  },
});

// Get available time slots for a date
export const getAvailableSlots = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing appointments for the date
    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_scheduled_date", (q) => q.eq("scheduledDate", args.date))
      .collect();

    // Shop hours: 8 AM to 5 PM, appointments every 30 minutes
    const shopHours = {
      start: 8, // 8 AM
      end: 17, // 5 PM
      interval: 30, // 30 minute slots
    };

    const allSlots: string[] = [];
    for (let hour = shopHours.start; hour < shopHours.end; hour++) {
      allSlots.push(`${hour.toString().padStart(2, "0")}:00`);
      allSlots.push(`${hour.toString().padStart(2, "0")}:30`);
    }

    // Remove booked slots
    const bookedSlots = existingAppointments.map((apt) => apt.scheduledTime);
    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

    return availableSlots;
  },
});

// Seed some demo services
export const seedServices = mutation({
  handler: async (ctx) => {
    await ctx.db.insert("services", {
      serviceName: "Oil Change",
      serviceCode: "oil_change",
      category: "maintenance",
      description: "Full synthetic oil change with filter replacement",
      typicalDuration: 30,
      basePrice: 59.99,
      typicalParts: [
        { partCategory: "oil", quantity: 1, required: true },
        { partCategory: "filter", quantity: 1, required: true },
      ],
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("services", {
      serviceName: "Brake Service",
      serviceCode: "brake_service",
      category: "repair",
      description: "Brake pad replacement and rotor inspection",
      typicalDuration: 90,
      basePrice: 249.99,
      typicalParts: [
        { partCategory: "brake_pad", quantity: 1, required: true },
        { partCategory: "brake_rotor", quantity: 1, required: false },
      ],
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("services", {
      serviceName: "Tire Rotation",
      serviceCode: "tire_rotation",
      category: "maintenance",
      description: "Rotate all four tires and check tire pressure",
      typicalDuration: 30,
      basePrice: 29.99,
      typicalParts: [],
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("services", {
      serviceName: "Tire Replacement",
      serviceCode: "tire_replacement",
      category: "repair",
      description: "Replace one or more tires with mounting and balancing",
      typicalDuration: 60,
      basePrice: 199.99,
      typicalParts: [{ partCategory: "tire", quantity: 4, required: true }],
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, message: "Services seeded" };
  },
});

// Save diagnostic intake notes from the voice call
export const saveDiagnosticNotes = mutation({
  args: {
    appointmentId: v.id("appointments"),
    diagnosticNotes: v.string(),
    reportedSymptoms: v.optional(
      v.array(
        v.object({
          symptom: v.string(),
          detail: v.string(),
        })
      )
    ),
    obdCodes: v.optional(
      v.array(
        v.object({
          code: v.string(),
          description: v.string(),
          urgency: v.string(),
          causes: v.array(v.string()),
          notes: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      diagnosticNotes: args.diagnosticNotes,
      reportedSymptoms: args.reportedSymptoms ?? [],
      obdCodes: args.obdCodes ?? [],
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Mark appointment as pending enrichment and store Apify run ID
export const setEnrichmentPending = mutation({
  args: {
    appointmentId: v.id("appointments"),
    apifyRunId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      enrichmentStatus: "pending",
      apifyRunId: args.apifyRunId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Write completed RockAuto parts data onto the appointment
export const updatePartsEnrichment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    enrichmentStatus: v.string(),
    partsEnrichment: v.optional(
      v.array(
        v.object({
          category: v.string(),
          partName: v.string(),
          partNumber: v.string(),
          brand: v.string(),
          price: v.number(),
          availability: v.string(),
          buyUrl: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      enrichmentStatus: args.enrichmentStatus,
      partsEnrichment: args.partsEnrichment ?? [],
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
