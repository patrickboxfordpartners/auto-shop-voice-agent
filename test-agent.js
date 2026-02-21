/**
 * Test script for voice agent conversation flow
 *
 * Run with: node test-agent.js
 */

// Mock conversation flow (without actual Convex calls)
class VoiceAgentTester {
  constructor() {
    this.state = { stage: "greeting", data: {} };
  }

  async simulate(transcript) {
    console.log("\n📞 Customer:", transcript);
    console.log("🤖 Agent:", await this.processInput(transcript));
    console.log("📊 State:", JSON.stringify(this.state, null, 2));
  }

  async processInput(transcript) {
    const text = transcript.toLowerCase();

    switch (this.state.stage) {
      case "greeting":
        this.state.data.customerPhone = "555-0100";
        this.state.stage = "collect_vehicle_info";
        return "Thank you for calling Mike's Auto Shop! I can help you schedule a service appointment today. First, I'll need some information about your vehicle. What year, make, and model is your car?";

      case "collect_vehicle_info":
        // Extract vehicle info
        const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
        if (yearMatch) this.state.data.vehicleYear = parseInt(yearMatch[1]);

        if (text.includes("honda")) this.state.data.vehicleMake = "Honda";
        if (text.includes("toyota")) this.state.data.vehicleMake = "Toyota";

        if (text.includes("civic")) this.state.data.vehicleModel = "Civic";
        if (text.includes("camry")) this.state.data.vehicleModel = "Camry";
        if (text.includes("accord")) this.state.data.vehicleModel = "Accord";

        if (this.state.data.vehicleYear && this.state.data.vehicleMake && this.state.data.vehicleModel) {
          this.state.stage = "collect_service_type";
          return `Got it, a ${this.state.data.vehicleYear} ${this.state.data.vehicleMake} ${this.state.data.vehicleModel}. What service do you need today? For example, an oil change, brake service, or tire rotation?`;
        } else {
          return "I got some of that, but I need the year, make, and model of your vehicle. Could you tell me again?";
        }

      case "collect_service_type":
        if (text.includes("oil")) {
          this.state.data.serviceType = "oil_change";
          this.state.data.serviceDescription = "Oil change with filter replacement";
        } else if (text.includes("brake")) {
          this.state.data.serviceType = "brake_service";
          this.state.data.serviceDescription = "Brake inspection and service";
        }

        this.state.stage = "identify_parts";
        return `Perfect, I'll schedule you for ${this.state.data.serviceDescription.toLowerCase()}. Let me check what parts we'll need and if we have them in stock. One moment please.`;

      case "identify_parts":
        // Simulate parts identification
        this.state.data.partsNeeded = ["part_oil_123", "part_filter_456"];
        this.state.stage = "check_inventory";
        return "Checking our inventory now...";

      case "check_inventory":
        // Simulate inventory check
        const needsOrdering = Math.random() > 0.5;
        this.state.data.needsOrdering = needsOrdering;
        this.state.stage = "schedule_appointment";

        if (needsOrdering) {
          return "Good news - I can get you scheduled. We're running low on the oil filter, so I've placed an order with our supplier. It'll arrive before your appointment. What day works best for you?";
        } else {
          return "Great news! We have all the parts in stock. What day works best for you for this service?";
        }

      case "schedule_appointment":
        // Extract date
        if (text.includes("tomorrow")) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          this.state.data.scheduledDate = tomorrow.toISOString().split("T")[0];
        } else if (text.includes("thursday")) {
          this.state.data.scheduledDate = "2026-02-27";
        }

        this.state.data.scheduledTime = "14:00";
        this.state.stage = "confirm_details";

        return `Perfect! I have you down for 2:00 PM on Thursday. Let me confirm the details: ${this.state.data.vehicleYear} ${this.state.data.vehicleMake} ${this.state.data.vehicleModel}, ${this.state.data.serviceDescription}. Is that correct?`;

      case "confirm_details":
        if (text.includes("yes") || text.includes("correct")) {
          this.state.stage = "complete";
          return `Excellent! Your appointment is confirmed for 2:00 PM on Thursday. We'll send you a text confirmation to ${this.state.data.customerPhone}. Is there anything else I can help you with today?`;
        } else {
          return "No problem! What would you like to change?";
        }

      case "complete":
        return "Thank you for calling Mike's Auto Shop! Have a great day!";

      default:
        return "I apologize, but I seem to have lost track of our conversation. Let me start over.";
    }
  }
}

// Run test conversation
async function runTest() {
  console.log("🧪 Voice Agent Test - Full Conversation Flow\n");
  console.log("=" .repeat(60));

  const agent = new VoiceAgentTester();

  // Simulate a full conversation
  await agent.simulate("Hi, I need an oil change");
  await agent.simulate("It's a 2018 Honda Civic");
  await agent.simulate("I need an oil change");
  await agent.simulate("How about Thursday?");
  await agent.simulate("Yes, that's correct");

  console.log("\n" + "=".repeat(60));
  console.log("✅ Test Complete!");
  console.log("\nFinal appointment details:");
  console.log(JSON.stringify(agent.state.data, null, 2));
}

runTest().catch(console.error);
