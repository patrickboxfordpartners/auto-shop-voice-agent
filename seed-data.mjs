/**
 * Seed demo data to Convex
 * Run with: node seed-data.mjs
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "https://necessary-emu-167.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function seedData() {
  console.log("🌱 Seeding demo data to Convex...");
  console.log(`   URL: ${CONVEX_URL}\n`);

  try {
    // 1. Seed parts catalog
    console.log("📦 Seeding parts catalog...");
    const partsResult = await client.mutation("parts:seedPartsCatalog");
    console.log("✅", partsResult.message);

    // 2. Seed services
    console.log("\n🔧 Seeding services...");
    const servicesResult = await client.mutation("appointments:seedServices");
    console.log("✅", servicesResult.message);

    // 3. Verify data
    console.log("\n🔍 Verifying data...");
    const lowStockParts = await client.query("parts:getPartsNeedingReorder");
    console.log(`✅ Parts needing reorder: ${lowStockParts.length}`);

    const todaysAppointments = await client.query("appointments:getTodaysAppointments");
    console.log(`✅ Today's appointments: ${todaysAppointments.length}`);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Demo data seeded successfully!");
    console.log("=".repeat(60));
    console.log(`\n📊 Dashboard: https://dashboard.convex.dev/d/necessary-emu-167`);
    console.log("🧪 Next: node test-agent.js\n");

  } catch (error) {
    console.error("❌ Error seeding data:", error.message);
    process.exit(1);
  }
}

seedData();
