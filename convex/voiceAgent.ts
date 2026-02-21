import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Voice Agent Conversation Flow
 *
 * This handles the main conversation logic for the auto shop assistant.
 * It follows a structured flow to gather all necessary information.
 */

export interface ConversationState {
  stage:
    | "greeting"
    | "collect_vehicle_info"
    | "collect_service_type"
    | "identify_parts"
    | "check_inventory"
    | "schedule_appointment"
    | "confirm_details"
    | "complete";

  data: {
    customerName?: string;
    customerPhone?: string;
    vehicleYear?: number;
    vehicleMake?: string;
    vehicleModel?: string;
    serviceType?: string;
    serviceDescription?: string;
    partsNeeded?: string[]; // part IDs
    needsOrdering?: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
  };
}

// Main voice agent handler
export const handleVoiceInput = action({
  args: {
    transcript: v.string(),
    callId: v.string(),
    phoneNumber: v.string(),
    conversationState: v.optional(
      v.object({
        stage: v.string(),
        data: v.any(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    response: string;
    nextState: ConversationState;
    action?: "book_appointment" | "create_order" | "end_call";
    appointmentId?: string;
  }> => {
    const state: ConversationState = args.conversationState
      ? (args.conversationState as ConversationState)
      : { stage: "greeting", data: {} };

    const transcript = args.transcript.toLowerCase();

    // Route to appropriate handler based on current stage
    switch (state.stage) {
      case "greeting":
        return handleGreeting(ctx, transcript, state, args.phoneNumber);

      case "collect_vehicle_info":
        return handleVehicleInfo(ctx, transcript, state);

      case "collect_service_type":
        return handleServiceType(ctx, transcript, state);

      case "identify_parts":
        return await handlePartsIdentification(ctx, state);

      case "check_inventory":
        return await handleInventoryCheck(ctx, state);

      case "schedule_appointment":
        return await handleScheduling(ctx, transcript, state);

      case "confirm_details":
        return await handleConfirmation(ctx, transcript, state, args.callId);

      default:
        return {
          response: "I apologize, but I seem to have lost track of our conversation. Let me start over. What can I help you with today?",
          nextState: { stage: "greeting", data: {} },
        };
    }
  },
});

// Stage handlers

function handleGreeting(
  ctx: any,
  transcript: string,
  state: ConversationState,
  phoneNumber: string
): {
  response: string;
  nextState: ConversationState;
} {
  // Check if customer mentioned their name
  const nameMatch = transcript.match(/(?:my name is|i'm|this is) ([a-z\s]+)/i);
  if (nameMatch) {
    state.data.customerName = nameMatch[1].trim();
  }

  state.data.customerPhone = phoneNumber;

  return {
    response: `Thank you for calling Mike's Auto Shop! ${
      state.data.customerName ? `Hi ${state.data.customerName}!` : ""
    } I can help you schedule a service appointment today. First, I'll need some information about your vehicle. What year, make, and model is your car?`,
    nextState: {
      stage: "collect_vehicle_info",
      data: state.data,
    },
  };
}

function handleVehicleInfo(
  ctx: any,
  transcript: string,
  state: ConversationState
): {
  response: string;
  nextState: ConversationState;
} {
  // Extract vehicle info from transcript
  // Pattern: "2018 Honda Civic" or "I have a 2018 Honda Civic"

  // Extract year (4 digits)
  const yearMatch = transcript.match(/\b(20\d{2}|19\d{2})\b/);

  // Common makes
  const makes = ["honda", "toyota", "ford", "chevrolet", "nissan", "hyundai", "kia", "mazda", "subaru"];
  const makeMatch = makes.find(make => transcript.includes(make));

  // Extract model (word after make, or common models)
  const models = ["civic", "accord", "camry", "corolla", "rav4", "f-150", "silverado", "altima", "rogue"];
  const modelMatch = models.find(model => transcript.includes(model));

  if (yearMatch) state.data.vehicleYear = parseInt(yearMatch[1]);
  if (makeMatch) state.data.vehicleMake = makeMatch.charAt(0).toUpperCase() + makeMatch.slice(1);
  if (modelMatch) state.data.vehicleModel = modelMatch.charAt(0).toUpperCase() + modelMatch.slice(1);

  // Check if we have all required info
  if (state.data.vehicleYear && state.data.vehicleMake && state.data.vehicleModel) {
    return {
      response: `Got it, a ${state.data.vehicleYear} ${state.data.vehicleMake} ${state.data.vehicleModel}. What service do you need today? For example, an oil change, brake service, tire rotation, or something else?`,
      nextState: {
        stage: "collect_service_type",
        data: state.data,
      },
    };
  } else {
    // Need more info
    const missing = [];
    if (!state.data.vehicleYear) missing.push("year");
    if (!state.data.vehicleMake) missing.push("make");
    if (!state.data.vehicleModel) missing.push("model");

    return {
      response: `I got some of that, but I need the ${missing.join(" and ")} of your vehicle. Could you tell me again?`,
      nextState: state,
    };
  }
}

function handleServiceType(
  ctx: any,
  transcript: string,
  state: ConversationState
): {
  response: string;
  nextState: ConversationState;
} {
  // Detect service type from transcript
  let serviceType = "";
  let serviceDescription = "";

  if (transcript.includes("oil change") || transcript.includes("oil")) {
    serviceType = "oil_change";
    serviceDescription = "Oil change with filter replacement";
  } else if (transcript.includes("brake") || transcript.includes("brakes")) {
    serviceType = "brake_service";
    serviceDescription = "Brake inspection and service";
  } else if (transcript.includes("tire rotation") || transcript.includes("rotate")) {
    serviceType = "tire_rotation";
    serviceDescription = "Tire rotation and pressure check";
  } else if (transcript.includes("tire") || transcript.includes("tires")) {
    serviceType = "tire_replacement";
    serviceDescription = "Tire replacement";
  } else {
    // Generic service
    serviceType = "general_service";
    serviceDescription = transcript;
  }

  state.data.serviceType = serviceType;
  state.data.serviceDescription = serviceDescription;

  return {
    response: `Perfect, I'll schedule you for ${serviceDescription.toLowerCase()}. Let me check what parts we'll need and if we have them in stock. One moment please.`,
    nextState: {
      stage: "identify_parts",
      data: state.data,
    },
  };
}

async function handlePartsIdentification(
  ctx: any,
  state: ConversationState
): Promise<{
  response: string;
  nextState: ConversationState;
}> {
  // Find compatible parts based on vehicle and service type
  const { vehicleYear, vehicleMake, vehicleModel, serviceType } = state.data;

  // Map service types to part categories
  const serviceToPartCategories: Record<string, string[]> = {
    oil_change: ["oil", "filter"],
    brake_service: ["brake_pad"],
    tire_replacement: ["tire"],
    tire_rotation: [],
  };

  const partCategories = serviceToPartCategories[serviceType!] || [];

  // Find compatible parts
  const partsNeeded = [];

  for (const category of partCategories) {
    const parts = await ctx.runQuery(api.parts.findCompatibleParts, {
      vehicleYear: vehicleYear!,
      vehicleMake: vehicleMake!,
      vehicleModel: vehicleModel!,
      partCategory: category,
    });

    if (parts.length > 0) {
      // Use the first compatible part
      partsNeeded.push(parts[0]._id);
    }
  }

  state.data.partsNeeded = partsNeeded;

  return {
    response: "Checking our inventory now...",
    nextState: {
      stage: "check_inventory",
      data: state.data,
    },
  };
}

async function handleInventoryCheck(
  ctx: any,
  state: ConversationState
): Promise<{
  response: string;
  nextState: ConversationState;
  action?: "create_order";
}> {
  const partsNeeded = state.data.partsNeeded || [];

  let needsOrdering = false;
  const outOfStockParts = [];

  // Check each part's inventory
  for (const partId of partsNeeded) {
    const stockCheck = await ctx.runQuery(api.parts.checkStock, {
      partId: partId,
    });

    if (!stockCheck.inStock || stockCheck.needsOrder) {
      needsOrdering = true;
      outOfStockParts.push(stockCheck.partDetails?.partName || "part");
    }
  }

  state.data.needsOrdering = needsOrdering;

  let response = "";
  if (needsOrdering) {
    response = `Good news - I can get you scheduled. We're running low on ${outOfStockParts.join(" and ")}, so I've placed an order with our supplier. It'll arrive before your appointment. What day works best for you?`;
  } else {
    response = `Great news! We have all the parts in stock. What day works best for you for this service?`;
  }

  return {
    response,
    nextState: {
      stage: "schedule_appointment",
      data: state.data,
    },
    action: needsOrdering ? "create_order" : undefined,
  };
}

async function handleScheduling(
  ctx: any,
  transcript: string,
  state: ConversationState
): Promise<{
  response: string;
  nextState: ConversationState;
}> {
  // Extract date from transcript
  const today = new Date();
  let targetDate = new Date();

  // Check for day references
  if (transcript.includes("today")) {
    targetDate = today;
  } else if (transcript.includes("tomorrow")) {
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 1);
  } else if (transcript.includes("monday")) {
    targetDate = getNextDayOfWeek(1);
  } else if (transcript.includes("tuesday")) {
    targetDate = getNextDayOfWeek(2);
  } else if (transcript.includes("wednesday")) {
    targetDate = getNextDayOfWeek(3);
  } else if (transcript.includes("thursday")) {
    targetDate = getNextDayOfWeek(4);
  } else if (transcript.includes("friday")) {
    targetDate = getNextDayOfWeek(5);
  }

  const dateString = targetDate.toISOString().split("T")[0];
  state.data.scheduledDate = dateString;

  // Get available slots
  const availableSlots = await ctx.runQuery(api.appointments.getAvailableSlots, {
    date: dateString,
  });

  if (availableSlots.length === 0) {
    return {
      response: `I'm sorry, we're fully booked that day. How about the next day?`,
      nextState: state,
    };
  }

  // Extract time if mentioned, otherwise suggest first available
  let timeMatch = transcript.match(/(\d{1,2})\s*(am|pm|o'clock)?/i);
  let suggestedTime = availableSlots[0];

  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const isPM = timeMatch[2]?.toLowerCase().includes("pm");

    if (isPM && hour < 12) hour += 12;
    if (hour < 8) hour = 8; // Shop opens at 8

    const requestedTime = `${hour.toString().padStart(2, "0")}:00`;

    if (availableSlots.includes(requestedTime)) {
      suggestedTime = requestedTime;
    }
  }

  state.data.scheduledTime = suggestedTime;

  // Format time for speech
  const hour = parseInt(suggestedTime.split(":")[0]);
  const minute = suggestedTime.split(":")[1];
  const displayTime = `${hour > 12 ? hour - 12 : hour}:${minute} ${hour >= 12 ? "PM" : "AM"}`;

  return {
    response: `Perfect! I have you down for ${displayTime} on ${formatDate(targetDate)}. Let me confirm the details: ${state.data.vehicleYear} ${state.data.vehicleMake} ${state.data.vehicleModel}, ${state.data.serviceDescription}. Is that correct?`,
    nextState: {
      stage: "confirm_details",
      data: state.data,
    },
  };
}

async function handleConfirmation(
  ctx: any,
  transcript: string,
  state: ConversationState,
  callId: string
): Promise<{
  response: string;
  nextState: ConversationState;
  action?: "book_appointment";
  appointmentId?: string;
}> {
  if (transcript.includes("yes") || transcript.includes("correct") || transcript.includes("right")) {
    // Book the appointment
    const appointmentId = await ctx.runMutation(api.appointments.createAppointment, {
      customerName: state.data.customerName || "Customer",
      customerPhone: state.data.customerPhone!,
      vehicleYear: state.data.vehicleYear!,
      vehicleMake: state.data.vehicleMake!,
      vehicleModel: state.data.vehicleModel!,
      serviceType: state.data.serviceType!,
      serviceDescription: state.data.serviceDescription!,
      estimatedDuration: state.data.serviceType === "oil_change" ? 30 : 60,
      scheduledDate: state.data.scheduledDate!,
      scheduledTime: state.data.scheduledTime!,
      partsNeeded: state.data.partsNeeded || [],
    });

    // Auto-reorder parts if needed
    if (state.data.needsOrdering) {
      await ctx.runMutation(api.orders.autoReorderLowStock, {
        appointmentId: appointmentId,
      });
    }

    const hour = parseInt(state.data.scheduledTime!.split(":")[0]);
    const minute = state.data.scheduledTime!.split(":")[1];
    const displayTime = `${hour > 12 ? hour - 12 : hour}:${minute} ${hour >= 12 ? "PM" : "AM"}`;

    return {
      response: `Excellent! Your appointment is confirmed for ${displayTime} on ${state.data.scheduledDate}. We'll send you a text confirmation to ${state.data.customerPhone}. Is there anything else I can help you with today?`,
      nextState: {
        stage: "complete",
        data: state.data,
      },
      action: "book_appointment",
      appointmentId: appointmentId,
    };
  } else {
    return {
      response: "No problem! What would you like to change?",
      nextState: state,
    };
  }
}

// Helper functions

function getNextDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const todayDay = today.getDay();
  const daysUntil = (dayOfWeek - todayDay + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
  return targetDate;
}

function formatDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}
