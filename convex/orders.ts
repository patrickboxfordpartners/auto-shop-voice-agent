import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new order to vendor
export const createOrder = mutation({
  args: {
    vendorId: v.id("vendors"),
    items: v.array(
      v.object({
        partId: v.id("parts"),
        quantity: v.number(),
        unitCost: v.number(),
      })
    ),
    triggeredByAppointmentId: v.optional(v.id("appointments")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate total cost
    const totalCost = args.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const orderId = await ctx.db.insert("orders", {
      vendorId: args.vendorId,
      orderNumber: orderNumber,
      items: args.items,
      totalCost: totalCost,
      status: "pending",
      orderDate: Date.now(),
      triggeredByAppointmentId: args.triggeredByAppointmentId,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      orderId,
      orderNumber,
      totalCost,
    };
  },
});

// Auto-create orders for parts below minimum stock
export const autoReorderLowStock = mutation({
  args: {
    appointmentId: v.optional(v.id("appointments")),
  },
  handler: async (ctx, args) => {
    // Get all parts that need reordering
    const allParts = await ctx.db.query("parts").collect();
    const lowStockParts = allParts.filter(
      (part) => part.currentStock <= part.minStock
    );

    if (lowStockParts.length === 0) {
      return { ordersCreated: 0, message: "No parts need reordering" };
    }

    // Group parts by vendor
    const partsByVendor = new Map<string, typeof lowStockParts>();

    for (const part of lowStockParts) {
      const vendorId = part.primaryVendorId;
      if (!partsByVendor.has(vendorId)) {
        partsByVendor.set(vendorId, []);
      }
      partsByVendor.get(vendorId)!.push(part);
    }

    // Create orders for each vendor
    const orders = [];

    for (const [vendorId, parts] of partsByVendor) {
      const items = parts.map((part) => ({
        partId: part._id,
        quantity: part.reorderQuantity,
        unitCost: part.unitCost,
      }));

      const totalCost = items.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0
      );

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const orderId = await ctx.db.insert("orders", {
        vendorId: vendorId as any,
        orderNumber: orderNumber,
        items: items,
        totalCost: totalCost,
        status: "pending",
        orderDate: Date.now(),
        triggeredByAppointmentId: args.appointmentId,
        notes: "Auto-generated order for low stock items",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      orders.push({
        orderId,
        orderNumber,
        vendorId,
        itemCount: items.length,
        totalCost,
      });
    }

    return {
      ordersCreated: orders.length,
      orders: orders,
    };
  },
});

// Get pending orders
export const getPendingOrders = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.string(),
    vendorOrderNumber: v.optional(v.string()),
    expectedDeliveryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.vendorOrderNumber) {
      updates.vendorOrderNumber = args.vendorOrderNumber;
    }

    if (args.expectedDeliveryDate) {
      updates.expectedDeliveryDate = args.expectedDeliveryDate;
    }

    if (args.status === "received") {
      updates.actualDeliveryDate = Date.now();
    }

    await ctx.db.patch(args.orderId, updates);

    return { success: true };
  },
});

// Mark order as received and update inventory
export const receiveOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Update each part's inventory
    for (const item of order.items) {
      const part = await ctx.db.get(item.partId);

      if (part) {
        await ctx.db.patch(item.partId, {
          currentStock: part.currentStock + item.quantity,
          updatedAt: Date.now(),
        });
      }
    }

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "received",
      actualDeliveryDate: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, message: "Order received and inventory updated" };
  },
});

// Get order details with part information
export const getOrderDetails = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      return null;
    }

    const vendor = await ctx.db.get(order.vendorId);

    // Get part details for each item
    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const part = await ctx.db.get(item.partId);
        return {
          ...item,
          partDetails: part,
        };
      })
    );

    return {
      ...order,
      vendor,
      items: itemsWithDetails,
    };
  },
});
