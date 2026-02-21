import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// CORS headers for all responses
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

// OPTIONS preflight
http.route({
  path: "/api/customers/lookup",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

http.route({
  path: "/api/parts/lookup",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

http.route({
  path: "/api/appointments/create",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

http.route({
  path: "/api/orders/trigger",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// GET /api/customers/lookup?phone=5551234567
// Returns CRM profile: name, visit history, and last known vehicle
http.route({
  path: "/api/customers/lookup",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone")?.replace(/\D/g, "") ?? "";

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Missing required param: phone" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const appointments = await ctx.runQuery(api.appointments.getCustomerAppointments, {
      customerPhone: phone,
    });

    if (appointments.length === 0) {
      return new Response(
        JSON.stringify({ found: false, phone }),
        { status: 200, headers: corsHeaders() }
      );
    }

    // Sort by most recent first
    const sorted = [...appointments].sort((a, b) => b.createdAt - a.createdAt);
    const latest = sorted[0];

    // Build unique vehicle list (deduplicated by year+make+model)
    const vehicleMap = new Map<string, { year: number; make: string; model: string }>();
    for (const apt of sorted) {
      const key = `${apt.vehicleYear}-${apt.vehicleMake}-${apt.vehicleModel}`;
      if (!vehicleMap.has(key)) {
        vehicleMap.set(key, {
          year: apt.vehicleYear,
          make: apt.vehicleMake,
          model: apt.vehicleModel,
        });
      }
    }

    return new Response(
      JSON.stringify({
        found: true,
        phone,
        customerName: latest.customerName,
        visitCount: appointments.length,
        lastVisitDate: latest.scheduledDate,
        lastService: latest.serviceType,
        lastVehicle: {
          year: latest.vehicleYear,
          make: latest.vehicleMake,
          model: latest.vehicleModel,
        },
        vehicles: Array.from(vehicleMap.values()),
      }),
      { status: 200, headers: corsHeaders() }
    );
  }),
});

// GET /api/parts/lookup?year=2018&make=Honda&model=Civic&service=oil_change
// Returns compatible parts + inventory status for the given vehicle + service
http.route({
  path: "/api/parts/lookup",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get("year") ?? "0");
    const make = url.searchParams.get("make") ?? "";
    const model = url.searchParams.get("model") ?? "";
    const service = url.searchParams.get("service") ?? "";

    if (!year || !make || !model || !service) {
      return new Response(
        JSON.stringify({ error: "Missing required params: year, make, model, service" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // Map service name to part categories
    const SERVICE_PARTS: Record<string, string[]> = {
      oil_change: ["oil", "filter"],
      brake_service: ["brake_pad", "brake_rotor"],
      tire_rotation: [],
      tire_replacement: ["tire"],
      brake_pad_replacement: ["brake_pad"],
      muffler: ["muffler"],
      transmission: ["transmission_fluid", "filter"],
    };

    const partCategories = SERVICE_PARTS[service.toLowerCase()] ?? [];

    const results: Array<{
      category: string;
      parts: Array<{
        partId: string;
        partNumber: string;
        partName: string;
        inStock: boolean;
        currentStock: number;
        needsOrder: boolean;
        retailPrice: number;
        vendorId: string;
      }>;
    }> = [];

    for (const category of partCategories) {
      const compatible = await ctx.runQuery(api.parts.findCompatibleParts, {
        vehicleYear: year,
        vehicleMake: make,
        vehicleModel: model,
        partCategory: category,
      });

      results.push({
        category,
        parts: compatible.map((p) => ({
          partId: p._id,
          partNumber: p.partNumber,
          partName: p.partName,
          inStock: p.currentStock > 0,
          currentStock: p.currentStock,
          needsOrder: p.currentStock <= p.minStock,
          retailPrice: p.retailPrice,
          vendorId: p.primaryVendorId,
        })),
      });
    }

    return new Response(
      JSON.stringify({
        vehicle: { year, make, model },
        service,
        categories: results,
        allInStock: results.every((r) =>
          r.parts.length === 0 || r.parts.some((p) => p.inStock)
        ),
        needsOrder: results.some((r) => r.parts.some((p) => p.needsOrder)),
      }),
      { status: 200, headers: corsHeaders() }
    );
  }),
});

// POST /api/appointments/create
// Body: { customerName, customerPhone, vehicleYear, vehicleMake, vehicleModel,
//         serviceType, serviceDescription, estimatedDuration, scheduledDate,
//         scheduledTime, partsNeeded? }
http.route({
  path: "/api/appointments/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const required = [
      "customerName", "customerPhone", "vehicleYear", "vehicleMake",
      "vehicleModel", "serviceType", "serviceDescription",
      "estimatedDuration", "scheduledDate", "scheduledTime",
    ];

    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: corsHeaders() }
        );
      }
    }

    const appointmentId = await ctx.runMutation(api.appointments.createAppointment, {
      customerName: body.customerName as string,
      customerPhone: body.customerPhone as string,
      customerEmail: body.customerEmail as string | undefined,
      vehicleYear: body.vehicleYear as number,
      vehicleMake: body.vehicleMake as string,
      vehicleModel: body.vehicleModel as string,
      serviceType: body.serviceType as string,
      serviceDescription: body.serviceDescription as string,
      estimatedDuration: body.estimatedDuration as number,
      scheduledDate: body.scheduledDate as string,
      scheduledTime: body.scheduledTime as string,
      partsNeeded: (body.partsNeeded as string[] | undefined) ?? [],
    });

    return new Response(
      JSON.stringify({
        success: true,
        appointmentId,
        message: `Appointment booked for ${body.customerName} on ${body.scheduledDate} at ${body.scheduledTime}`,
      }),
      { status: 201, headers: corsHeaders() }
    );
  }),
});

// POST /api/appointments/diagnostic
// Body: { appointmentId, diagnosticNotes, reportedSymptoms?, obdCodes? }
http.route({
  path: "/api/appointments/diagnostic",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders() }
      );
    }
    if (!body.appointmentId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: appointmentId" }),
        { status: 400, headers: corsHeaders() }
      );
    }
    await ctx.runMutation(api.appointments.saveDiagnosticNotes, {
      appointmentId: body.appointmentId as never,
      diagnosticNotes: (body.diagnosticNotes as string) ?? "",
      reportedSymptoms: body.reportedSymptoms as never,
      obdCodes: body.obdCodes as never,
    });
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders() }
    );
  }),
});

http.route({
  path: "/api/appointments/diagnostic",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// POST /api/orders/trigger
// Body: { partIds: string[], appointmentId?: string }
// Triggers auto-reorder for the specified parts if they are below min stock
http.route({
  path: "/api/orders/trigger",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const result = await ctx.runMutation(api.orders.autoReorderLowStock, {
      appointmentId: body.appointmentId as string | undefined,
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: corsHeaders() }
    );
  }),
});

// POST /api/apify/webhook?apptId=<appointmentId>
// Called by Apify when the RockAuto actor run completes.
// Fetches the dataset, picks the best part per category, writes to the appointment.
http.route({
  path: "/api/apify/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const apptId = url.searchParams.get("apptId") ?? "";

    if (!apptId) {
      return new Response(
        JSON.stringify({ error: "Missing apptId param" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    // Apify sends eventData or resource — both contain defaultDatasetId
    const eventData = (body.eventData ?? body.resource ?? {}) as Record<string, unknown>;
    const datasetId = eventData.defaultDatasetId as string | undefined;
    const eventType = body.eventType as string | undefined;

    // Mark failed if the run didn't succeed
    if (eventType && eventType !== "ACTOR.RUN.SUCCEEDED") {
      await ctx.runMutation(api.appointments.updatePartsEnrichment, {
        appointmentId: apptId as never,
        enrichmentStatus: "failed",
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }

    if (!datasetId) {
      await ctx.runMutation(api.appointments.updatePartsEnrichment, {
        appointmentId: apptId as never,
        enrichmentStatus: "failed",
      });
      return new Response(
        JSON.stringify({ error: "No defaultDatasetId in payload" }),
        { status: 200, headers: corsHeaders() }
      );
    }

    // Fetch the dataset items from Apify
    const apifyToken = process.env.APIFY_API_TOKEN ?? "";
    const datasetUrl =
      `https://api.apify.com/v2/datasets/${datasetId}/items` +
      `?token=${apifyToken}&clean=true&format=json`;

    let items: Record<string, unknown>[] = [];
    try {
      const resp = await fetch(datasetUrl);
      if (resp.ok) {
        items = (await resp.json()) as Record<string, unknown>[];
      }
    } catch {
      // Dataset fetch failed — mark as failed and move on
      await ctx.runMutation(api.appointments.updatePartsEnrichment, {
        appointmentId: apptId as never,
        enrichmentStatus: "failed",
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }

    // Normalize + pick best (lowest price, in-stock) option per category
    const byCategory = new Map<string, Record<string, unknown>[]>();

    for (const item of items) {
      // Normalize field names — RockAuto scraper may vary
      const rawCategory =
        (item.category as string) ||
        (item.partType as string) ||
        (item.subcategory as string) ||
        "unknown";

      const category = rawCategory
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category)!.push(item);
    }

    const enriched: Array<{
      category: string;
      partName: string;
      partNumber: string;
      brand: string;
      price: number;
      availability: string;
      buyUrl: string;
    }> = [];

    for (const [category, parts] of byCategory) {
      // Prefer in-stock, then sort by price ascending
      const sorted = [...parts].sort((a, b) => {
        const aStock = String(a.availability ?? a.inStock ?? "").toLowerCase();
        const bStock = String(b.availability ?? b.inStock ?? "").toLowerCase();
        const aInStock = aStock.includes("stock") || aStock === "true";
        const bInStock = bStock.includes("stock") || bStock === "true";

        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;

        const aPrice = parseFloat(String(a.price ?? a.listPrice ?? a.salePrice ?? "9999"));
        const bPrice = parseFloat(String(b.price ?? b.listPrice ?? b.salePrice ?? "9999"));
        return aPrice - bPrice;
      });

      const best = sorted[0];
      if (!best) continue;

      const price = parseFloat(
        String(best.price ?? best.listPrice ?? best.salePrice ?? "0")
      );
      const availability = String(
        best.availability ?? best.inStock ?? best.stock ?? "Unknown"
      );
      const buyUrl = String(best.url ?? best.link ?? best.productUrl ?? "");
      const partName = String(best.partName ?? best.name ?? best.title ?? "Unknown Part");
      const partNumber = String(best.partNumber ?? best.number ?? best.sku ?? "");
      const brand = String(best.brand ?? best.manufacturer ?? best.make ?? "");

      if (partName && partName !== "Unknown Part") {
        enriched.push({ category, partName, partNumber, brand, price, availability, buyUrl });
      }
    }

    await ctx.runMutation(api.appointments.updatePartsEnrichment, {
      appointmentId: apptId as never,
      enrichmentStatus: enriched.length > 0 ? "complete" : "failed",
      partsEnrichment: enriched,
    });

    return new Response(
      JSON.stringify({ ok: true, partsFound: enriched.length }),
      { status: 200, headers: corsHeaders() }
    );
  }),
});

http.route({
  path: "/api/apify/webhook",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

export default http;
