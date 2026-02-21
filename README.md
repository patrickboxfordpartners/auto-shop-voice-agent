# Auto Shop Voice Agent 🚗🔧

**Voice AI assistant for auto repair shops** - Built for Voice HackSprint

Handles customer calls, identifies parts, checks inventory, places vendor orders, and schedules appointments automatically.

---

## 🎯 The Problem

Auto shops waste 10-15 minutes per phone call:
- Manual parts lookup
- Inventory checking
- Appointment scheduling
- Vendor ordering

**Our solution:** Voice AI agent that handles the entire flow in 2-3 minutes.

---

## ✨ Demo Flow

```
📞 Customer calls: "Hi, I need an oil change for my 2018 Honda Civic"

🤖 Agent:
  ✓ Identifies vehicle (2018 Honda Civic)
  ✓ Determines service type (oil change)
  ✓ Looks up exact parts needed (Honda 0W-20 oil + filter #15400-PLM-A02)
  ✓ Checks inventory in real-time
  ✓ Places vendor order if parts are low
  ✓ Books appointment for Thursday 2pm
  ✓ Sends SMS confirmation

💼 Shop saves: 10 minutes per call, never misses a parts order
```

---

## 🏗️ Architecture

### Convex Backend (Real-time Sync)
```
appointments/    → Customer appointments with real-time updates
parts/          → Parts catalog with vehicle compatibility
orders/         → Vendor orders (auto-triggered on low stock)
vendors/        → Supplier information
services/       → Service definitions (oil change, brakes, etc.)
callLogs/       → Call analytics and transcripts
```

### Voice Agent Flow
```
1. Greeting → Collect name
2. Vehicle Info → Year, make, model
3. Service Type → Oil change, brakes, tires, etc.
4. Parts ID → Match parts to vehicle + service
5. Inventory Check → Real-time stock check
6. Auto-Order → Trigger vendor order if low stock
7. Scheduling → Find available time slots
8. Confirmation → Book appointment + send SMS
```

### Parts Intelligence (The "Magic")
```typescript
// Input: "2018 Honda Civic" + "oil change"
// Output: Exact parts needed

Honda 0W-20 Synthetic Oil (Part #HON-0W20-5QT)
Honda Oil Filter (Part #15400-PLM-A02)
  ↓
Check inventory
  ↓
If low stock → Auto-order from vendor
```

---

## 📊 Convex Schema

### Core Tables

**appointments**
- Customer info (name, phone)
- Vehicle details (year, make, model)
- Service type + description
- Scheduled date/time
- Parts needed (array of part IDs)
- Call metadata (recording, transcript)

**parts**
- Part number + name
- Vehicle compatibility (years, makes, models)
- Inventory levels (current, min, max)
- Pricing (cost, retail)
- Vendor info

**orders**
- Vendor + items
- Status (pending → confirmed → shipped → received)
- Triggered by appointment (optional)
- Auto-generated when stock is low

**vendors**
- Contact info
- Delivery times
- API endpoints (for future integration)

---

## 🚀 Quick Start

### 1. Setup Convex

```bash
npm install
npx convex dev
```

### 2. Seed Demo Data

```bash
# In Convex dashboard or via functions:
- Run seedPartsCatalog() to add 5 common parts
- Run seedServices() to add 4 services
```

### 3. Test Voice Agent

```typescript
// Simulate a customer call
const result = await handleVoiceInput({
  transcript: "Hi, I need an oil change for my 2018 Honda Civic",
  callId: "test-123",
  phoneNumber: "555-0100",
  conversationState: undefined // starts fresh
});

// Agent response + updated state
console.log(result.response);
console.log(result.nextState);
```

---

## 🎤 Voice Agent API

### `handleVoiceInput()`

**Input:**
```typescript
{
  transcript: string,           // What customer said
  callId: string,               // Unique call identifier
  phoneNumber: string,          // Caller's phone
  conversationState?: {         // Previous state (optional)
    stage: "greeting" | "collect_vehicle_info" | ...,
    data: { ... }
  }
}
```

**Output:**
```typescript
{
  response: string,             // What agent should say
  nextState: ConversationState, // Updated state
  action?: "book_appointment" | "create_order" | "end_call",
  appointmentId?: string        // If appointment booked
}
```

### Conversation Stages

1. **greeting** - "Thank you for calling Mike's Auto Shop!"
2. **collect_vehicle_info** - Extract year, make, model
3. **collect_service_type** - Oil change? Brakes? Tires?
4. **identify_parts** - Match parts to vehicle + service
5. **check_inventory** - Real-time stock check
6. **schedule_appointment** - Find available time slots
7. **confirm_details** - Confirm and book
8. **complete** - Send confirmation

---

## 🛠️ Integration Points

### Voice Layer (Choose One)
- **smallest.ai** - Hackathon credits provided
- **Vapi** - Voice AI infrastructure
- **Twilio + ElevenLabs** - DIY voice pipeline

### Calendar Integration
```typescript
// Google Calendar API
const event = {
  summary: `${customerName} - ${serviceName}`,
  start: { dateTime: `${date}T${time}` },
  end: { dateTime: /* + duration */ }
};

await calendar.events.insert({ calendarId: 'primary', resource: event });
```

### SMS Confirmation
```typescript
// Twilio
await client.messages.create({
  to: customerPhone,
  from: shopPhone,
  body: `Appointment confirmed for ${time} on ${date}. See you then!`
});
```

---

## 📈 Dashboard Features (v0 Generated)

### Real-time Updates via Convex

**Today's Schedule**
- List of appointments
- Vehicle info + service type
- Status (scheduled, in-progress, completed)

**Low Inventory Alerts**
- Parts below minimum stock
- Auto-orders pending/in-transit

**Pending Orders**
- Vendor name + order details
- Expected delivery date
- One-click receive + update inventory

**Call Analytics**
- Total calls today
- Appointments booked
- Average call duration
- Common service types

---

## 🎨 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | **Convex** | Real-time sync, zero config |
| Voice | **smallest.ai** | Hackathon credits |
| UI | **v0 + Next.js** | Generate dashboard in minutes |
| Calendar | **Google Calendar** | Standard integration |
| SMS | **Twilio** | Reliable delivery |

---

## 📝 Hackathon Demo Script (90 seconds)

### Setup (Before demo)
1. Seed parts catalog + services
2. Have dashboard open (today's appointments view)
3. Prepare phone to call demo number

### Live Demo
```
[Start recording]

👋 "Auto shops waste 10+ minutes per phone call doing manual work."

📞 [Call demo number]
   Customer: "Hi, I need an oil change for my 2018 Honda Civic"

🤖 Agent: [Collects info, identifies parts, checks inventory, books appointment]

📊 [Show dashboard updating in real-time]
   - New appointment appears
   - Parts inventory decrements
   - Vendor order created (low stock)

✅ "Shop saves 10 minutes, never misses a parts order, customer gets instant confirmation."

[End - 90 seconds]
```

---

## 🔮 Future Enhancements

### Phase 2 (Post-hackathon)
- **Real VIN decoder** - Extract all vehicle specs from VIN
- **Actual vendor APIs** - AutoZone, O'Reilly, NAPA
- **Payment processing** - Collect deposits during call
- **Multi-location** - Support shop chains
- **Spanish support** - Bilingual voice agent

### Smart Features
- **Price quotes** - Real-time pricing based on parts + labor
- **Appointment reminders** - Auto-call 24 hours before
- **Follow-up calls** - "How was your service?"
- **Upselling logic** - "Your brake pads are due soon, want to add that?"

---

## 🏆 Why This Wins

**Clear Use Case** - Auto shops are a huge market with real pain
**Technical Depth** - Multi-step agent, inventory management, vendor integration
**Live Demo** - End-to-end flow in 90 seconds
**Real-time Magic** - Dashboard updates as agent talks (Convex!)
**Business Value** - ROI is obvious (10 min × $50/hr × 20 calls/day = $166/day saved)

---

## 📚 Key Files

```
convex/
├── schema.ts           → All database tables
├── parts.ts            → Parts lookup + inventory
├── appointments.ts     → Appointment booking
├── orders.ts           → Vendor ordering
└── voiceAgent.ts       → Conversation flow logic
```

---

## 🚢 Deployment Checklist

- [ ] Deploy Convex backend (`npx convex deploy`)
- [ ] Set up voice provider (smallest.ai or Vapi)
- [ ] Deploy Next.js dashboard (Vercel)
- [ ] Configure phone number
- [ ] Add demo data (parts + services)
- [ ] Test full flow
- [ ] Prepare 90-second demo script

---

## 🤝 Team

Built for Voice HackSprint by:
- [Your Name]
- Contact: [Email/Twitter]

---

## 📄 License

MIT - Built at Voice HackSprint 2026
