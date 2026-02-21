import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Find parts compatible with a specific vehicle
export const findCompatibleParts = query({
  args: {
    vehicleYear: v.number(),
    vehicleMake: v.string(),
    vehicleModel: v.string(),
    partCategory: v.string(),
  },
  handler: async (ctx, args) => {
    const parts = await ctx.db.query("parts").collect();

    return parts.filter((part) => {
      return (
        part.partCategory === args.partCategory &&
        part.compatibleYears.includes(args.vehicleYear) &&
        part.compatibleMakes.includes(args.vehicleMake) &&
        part.compatibleModels.includes(args.vehicleModel)
      );
    });
  },
});

// Check if part is in stock
export const checkStock = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId);

    if (!part) {
      return { inStock: false, needsOrder: true };
    }

    return {
      inStock: part.currentStock > 0,
      needsOrder: part.currentStock <= part.minStock,
      currentStock: part.currentStock,
      partDetails: part,
    };
  },
});

// Update stock level
export const updateStock = mutation({
  args: {
    partId: v.id("parts"),
    quantity: v.number(), // positive to add, negative to remove
  },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId);

    if (!part) {
      throw new Error("Part not found");
    }

    const newStock = part.currentStock + args.quantity;

    await ctx.db.patch(args.partId, {
      currentStock: Math.max(0, newStock),
      updatedAt: Date.now(),
    });

    return {
      partId: args.partId,
      previousStock: part.currentStock,
      newStock: Math.max(0, newStock),
      needsReorder: Math.max(0, newStock) <= part.minStock,
    };
  },
});

// Get parts that need reordering
export const getPartsNeedingReorder = query({
  handler: async (ctx) => {
    const parts = await ctx.db.query("parts").collect();

    return parts.filter((part) => part.currentStock <= part.minStock);
  },
});

// Seed parts catalog (for demo)
export const seedPartsCatalog = mutation({
  handler: async (ctx) => {
    // First, get or create a vendor
    const vendors = await ctx.db.query("vendors").collect();
    let vendorId;

    if (vendors.length === 0) {
      vendorId = await ctx.db.insert("vendors", {
        vendorName: "AutoZone Wholesale",
        contactName: "Sales Department",
        contactPhone: "1-800-AUTO-PART",
        contactEmail: "wholesale@autozone.com",
        deliveryDays: 2,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      vendorId = vendors[0]._id;
    }

    // Honda Civic oil change parts
    await ctx.db.insert("parts", {
      partNumber: "HON-0W20-5QT",
      partName: "Honda 0W-20 Synthetic Oil",
      partCategory: "oil",
      compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
      compatibleMakes: ["Honda"],
      compatibleModels: ["Civic", "Accord", "CR-V"],
      description: "Genuine Honda 0W-20 full synthetic motor oil",
      specifications: "0W-20 Full Synthetic, 5 Quart Container",
      manufacturer: "Honda",
      currentStock: 12,
      minStock: 5,
      maxStock: 30,
      unitCost: 28.99,
      retailPrice: 45.99,
      primaryVendorId: vendorId,
      reorderQuantity: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("parts", {
      partNumber: "HON-15400-PLM-A02",
      partName: "Honda Oil Filter",
      partCategory: "filter",
      compatibleYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022],
      compatibleMakes: ["Honda"],
      compatibleModels: ["Civic", "Accord", "CR-V", "Fit"],
      description: "OEM Honda oil filter",
      specifications: "Part #15400-PLM-A02",
      manufacturer: "Honda",
      currentStock: 8,
      minStock: 10,
      maxStock: 50,
      unitCost: 6.99,
      retailPrice: 12.99,
      primaryVendorId: vendorId,
      reorderQuantity: 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Toyota Camry parts
    await ctx.db.insert("parts", {
      partNumber: "TOY-0W16-5QT",
      partName: "Toyota 0W-16 Synthetic Oil",
      partCategory: "oil",
      compatibleYears: [2018, 2019, 2020, 2021, 2022],
      compatibleMakes: ["Toyota"],
      compatibleModels: ["Camry", "Corolla", "RAV4"],
      description: "Genuine Toyota 0W-16 full synthetic motor oil",
      specifications: "0W-16 Full Synthetic, 5 Quart Container",
      manufacturer: "Toyota",
      currentStock: 15,
      minStock: 5,
      maxStock: 30,
      unitCost: 29.99,
      retailPrice: 46.99,
      primaryVendorId: vendorId,
      reorderQuantity: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Generic brake pads
    await ctx.db.insert("parts", {
      partNumber: "BRKPD-CER-F100",
      partName: "Ceramic Front Brake Pads - Universal",
      partCategory: "brake_pad",
      compatibleYears: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022],
      compatibleMakes: ["Honda", "Toyota", "Ford", "Chevrolet"],
      compatibleModels: ["Civic", "Camry", "Corolla", "Accord", "F-150", "Silverado"],
      description: "Premium ceramic brake pads for front axle",
      specifications: "Ceramic compound, low dust",
      manufacturer: "Wagner",
      currentStock: 6,
      minStock: 8,
      maxStock: 40,
      unitCost: 42.99,
      retailPrice: 79.99,
      primaryVendorId: vendorId,
      reorderQuantity: 15,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // All-season tires
    await ctx.db.insert("parts", {
      partNumber: "TIRE-225-60R17",
      partName: "All-Season Tire 225/60R17",
      partCategory: "tire",
      compatibleYears: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022],
      compatibleMakes: ["Honda", "Toyota", "Nissan", "Ford"],
      compatibleModels: ["CR-V", "RAV4", "Rogue", "Escape"],
      description: "Premium all-season tire",
      specifications: "225/60R17 99H",
      manufacturer: "Michelin",
      currentStock: 16,
      minStock: 12,
      maxStock: 60,
      unitCost: 115.00,
      retailPrice: 189.99,
      primaryVendorId: vendorId,
      reorderQuantity: 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, message: "Parts catalog seeded" };
  },
});
