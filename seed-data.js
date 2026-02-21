/**
 * Seed demo data to Convex
 * Run with: node seed-data.js
 */

const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://necessary-emu-167.convex.cloud");

async function seedData() {
  console.log("🌱 Seeding demo data to Convex...\n");

  try {
    // 1. Seed parts catalog
    console.log("📦 Seeding parts catalog...");
    const partsResult = await client.mutation(api.parts.seedPartsCatalog);
    console.log("✅", partsResult.message);

    // 2. Seed services
    console.log("\n🔧 Seeding services...");
    const servicesResult = await client.mutation(api.appointments.seedServices);
    console.log("✅", servicesResult.message);

    // 3. Verify data
    console.log("\n🔍 Verifying data...");
    const lowStockParts = await client.query(api.parts.getPartsNeedingReorder);
    console.log(`✅ Found ${lowStockParts.length} parts that need reordering (Honda filter)`);

    const todaysAppointments = await client.query(api.appointments.getTodaysAppointments);
    console.log(`✅ Today's appointments: ${todaysAppointments.length} (should be 0 for now)`);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Demo data seeded successfully!");
    console.log("=".repeat(60));
    console.log("\n📊 Dashboard: https://dashboard.convex.dev/d/necessary-emu-167");
    console.log("🧪 Next: node test-agent.js");
    console.log("\n");

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedData();
