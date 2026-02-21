import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Customer appointments
  appointments: defineTable({
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),

    // Vehicle information
    vehicleYear: v.number(),
    vehicleMake: v.string(),
    vehicleModel: v.string(),
    vehicleVin: v.optional(v.string()),

    // Service details
    serviceType: v.string(), // "oil_change", "brake_service", "tire_rotation", etc.
    serviceDescription: v.string(),
    estimatedDuration: v.number(), // in minutes

    // Scheduling
    scheduledDate: v.string(), // ISO date string
    scheduledTime: v.string(), // "09:00", "14:30", etc.
    status: v.string(), // "scheduled", "confirmed", "in_progress", "completed", "cancelled"

    // Parts needed for this appointment
    partsNeeded: v.array(v.id("parts")),

    // Pre-diagnostic intake (captured during the call)
    diagnosticNotes: v.optional(v.string()),
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

    // RockAuto background enrichment
    enrichmentStatus: v.optional(v.string()), // "pending" | "complete" | "failed"
    apifyRunId: v.optional(v.string()),
    partsEnrichment: v.optional(
      v.array(
        v.object({
          category: v.string(),    // "oil", "filter", "brake_pad"
          partName: v.string(),
          partNumber: v.string(),
          brand: v.string(),
          price: v.number(),
          availability: v.string(),
          buyUrl: v.string(),
        })
      )
    ),

    // Call metadata
    callRecordingUrl: v.optional(v.string()),
    callDuration: v.optional(v.number()),
    callTranscript: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer_phone", ["customerPhone"])
    .index("by_scheduled_date", ["scheduledDate"])
    .index("by_status", ["status"]),

  // Parts catalog
  parts: defineTable({
    partNumber: v.string(),
    partName: v.string(),
    partCategory: v.string(), // "oil", "filter", "brake_pad", "tire", etc.

    // Vehicle compatibility
    compatibleYears: v.array(v.number()), // [2015, 2016, 2017, 2018]
    compatibleMakes: v.array(v.string()), // ["Honda", "Acura"]
    compatibleModels: v.array(v.string()), // ["Civic", "Accord"]

    // Part details
    description: v.string(),
    specifications: v.optional(v.string()), // "0W-20 Synthetic", "Ceramic brake pads"
    manufacturer: v.string(),

    // Inventory
    currentStock: v.number(),
    minStock: v.number(), // Reorder threshold
    maxStock: v.number(),
    unitCost: v.number(),
    retailPrice: v.number(),

    // Vendor info
    primaryVendorId: v.id("vendors"),
    reorderQuantity: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_part_number", ["partNumber"])
    .index("by_category", ["partCategory"])
    .index("by_stock_level", ["currentStock"]),

  // Vendors
  vendors: defineTable({
    vendorName: v.string(),
    contactName: v.string(),
    contactPhone: v.string(),
    contactEmail: v.string(),

    // Ordering details
    accountNumber: v.optional(v.string()),
    apiEndpoint: v.optional(v.string()),
    apiKey: v.optional(v.string()),

    // Terms
    deliveryDays: v.number(), // typical delivery time
    minimumOrder: v.optional(v.number()),

    status: v.string(), // "active", "inactive"

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor_name", ["vendorName"])
    .index("by_status", ["status"]),

  // Parts orders to vendors
  orders: defineTable({
    vendorId: v.id("vendors"),
    orderNumber: v.string(), // our internal order number
    vendorOrderNumber: v.optional(v.string()), // vendor's confirmation number

    // Order details
    items: v.array(
      v.object({
        partId: v.id("parts"),
        quantity: v.number(),
        unitCost: v.number(),
      })
    ),

    totalCost: v.number(),

    // Status tracking
    status: v.string(), // "pending", "submitted", "confirmed", "shipped", "received", "cancelled"
    orderDate: v.number(),
    expectedDeliveryDate: v.optional(v.number()),
    actualDeliveryDate: v.optional(v.number()),

    // Related to appointment if triggered by low stock during booking
    triggeredByAppointmentId: v.optional(v.id("appointments")),

    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"])
    .index("by_order_date", ["orderDate"]),

  // Service definitions (what services the shop offers)
  services: defineTable({
    serviceName: v.string(),
    serviceCode: v.string(), // "oil_change", "brake_service"
    category: v.string(), // "maintenance", "repair", "inspection"

    description: v.string(),
    typicalDuration: v.number(), // minutes
    basePrice: v.number(),

    // What parts are typically needed
    typicalParts: v.array(
      v.object({
        partCategory: v.string(),
        quantity: v.number(),
        required: v.boolean(),
      })
    ),

    active: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_service_code", ["serviceCode"])
    .index("by_active", ["active"]),

  // Call logs for analytics
  callLogs: defineTable({
    callId: v.string(), // from voice provider
    phoneNumber: v.string(),
    direction: v.string(), // "inbound", "outbound"

    // Call outcome
    outcome: v.string(), // "appointment_booked", "information_only", "transferred", "voicemail"
    appointmentId: v.optional(v.id("appointments")),

    // Call details
    duration: v.number(), // seconds
    recordingUrl: v.optional(v.string()),
    transcriptUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),

    // AI metadata
    intent: v.optional(v.string()), // detected intent
    sentiment: v.optional(v.string()), // "positive", "neutral", "negative"

    timestamp: v.number(),
  })
    .index("by_phone_number", ["phoneNumber"])
    .index("by_outcome", ["outcome"])
    .index("by_timestamp", ["timestamp"]),
});
