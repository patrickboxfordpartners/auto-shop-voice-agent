# ⚡ Quick Start - Day of Hackathon

## Pre-Event Setup (Do This Now!)

### 1. Install Dependencies
```bash
cd auto-shop-voice-agent
npm install
```

### 2. Set Up Convex Account
1. Go to https://convex.dev
2. Sign up with GitHub
3. Create new project: "auto-shop-voice-agent"

### 3. Deploy to Convex
```bash
npx convex dev
```

This will:
- Link to your Convex project
- Deploy all functions
- Generate TypeScript types
- Start watching for changes

### 4. Seed Demo Data

Open Convex Dashboard → Functions, then run:
```typescript
// 1. Seed parts catalog
parts.seedPartsCatalog()

// 2. Seed services
appointments.seedServices()
```

You should see:
- 5 parts added (Honda oil, Toyota oil, brake pads, tires, filters)
- 4 services added (oil change, brakes, tire rotation, tire replacement)

### 5. Test the Agent
```bash
node test-agent.js
```

Expected output: Full conversation flow from greeting to appointment confirmation.

---

## Day-Of Checklist

### Morning Session (9 AM - 12 PM)

#### Hour 1: Voice Integration (9-10 AM)
**Get smallest.ai credits from sponsors**

Then choose integration path:

**Option A: Webhook (Recommended)**
```typescript
// smallest.ai config:
{
  webhook: "https://your-convex-url.site/voiceAgent/handleVoiceInput",
  voice: "en-US-Neural2-A",
  language: "en-US"
}
```

**Option B: Direct API**
```typescript
import { handleVoiceInput } from "./convex/voiceAgent";

// On each transcript chunk:
const result = await client.action(api.voiceAgent.handleVoiceInput, {
  transcript: transcription,
  callId: call.id,
  phoneNumber: caller.number,
  conversationState: state
});

// Speak result.response
await textToSpeech(result.response);

// Update state for next turn
state = result.nextState;
```

#### Hour 2: Dashboard with v0 (10-11 AM)
**Go to v0.dev**

**Prompt 1: Layout**
```
Create a Next.js dashboard for an auto shop with:
- Header: "Mike's Auto Shop Dashboard"
- Three cards in a row:
  1. Today's Appointments (shows list)
  2. Low Inventory Alerts (parts below minimum)
  3. Pending Orders (vendor orders)
- Use Tailwind CSS
- Dark mode
- Real-time badge indicator
```

**Prompt 2: Appointments Card**
```
Create a component that displays today's appointments:
- Customer name
- Vehicle (2018 Honda Civic)
- Service type with icon
- Time (2:00 PM)
- Status badge (scheduled/in-progress/completed)
- Use Lucide icons
- Hover effects
```

**Prompt 3: Real-time Updates**
```typescript
import { useQuery } from "convex/react";
import { api } from "./convex/_generated/api";

function Dashboard() {
  const appointments = useQuery(api.appointments.getTodaysAppointments);
  const lowStock = useQuery(api.parts.getPartsNeedingReorder);
  const pendingOrders = useQuery(api.orders.getPendingOrders);

  // v0 generated JSX here...
}
```

#### Hour 3: Testing (11 AM - 12 PM)
**Test checklist:**
- [ ] Voice call connects
- [ ] Agent responds correctly
- [ ] Dashboard shows new appointment
- [ ] Inventory updates
- [ ] Orders are created when stock is low

**Fix common issues:**
- Voice not connecting? Check API keys
- Dashboard not updating? Refresh Convex connection
- Parts not found? Re-run seedPartsCatalog()

### Afternoon Session (12 PM - 4 PM)

#### Hour 1: Lunch + Refine (12-1 PM)
- Review demo script
- Test on phone (not just computer)
- Check audio quality

#### Hour 2: Polish (1-2 PM)
**Add these finishing touches:**

1. **Loading states**
```typescript
if (!appointments) return <LoadingSpinner />;
```

2. **Empty states**
```typescript
{appointments.length === 0 && (
  <EmptyState message="No appointments yet" />
)}
```

3. **Animations**
```typescript
// Framer Motion
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  {/* appointment card */}
</motion.div>
```

#### Hour 3: End-to-End Test (2-3 PM)
**Run through complete demo 3 times:**

Test 1: Oil change (Honda Civic)
Test 2: Brake service (Toyota Camry)
Test 3: Tire rotation (Ford F-150)

**Check:**
- [ ] Call quality
- [ ] Response time
- [ ] Dashboard updates
- [ ] All data correct

#### Hour 4: Prepare Presentation (3-4 PM)
**Create 5 slides (optional - live demo is better):**

1. Problem (auto shop photo + stats)
2. Solution (product screenshot)
3. Demo (live call)
4. Technical Architecture (diagram)
5. Impact (ROI calculation)

**Practice opening:**
> "I'm [Name]. Auto shops waste 10+ minutes per call on manual work. We built a voice AI that does it in 2 minutes. Watch this."

### Demo Prep (4-5 PM)

#### 30 Minutes Before Demo
- [ ] Laptop fully charged
- [ ] Phone charged (for demo call)
- [ ] Test projector connection
- [ ] Close all browser tabs except dashboard
- [ ] Test call one more time
- [ ] Have backup recording ready
- [ ] Turn off notifications
- [ ] Silence phone (except demo call)
- [ ] Water bottle nearby

#### 5 Minutes Before Demo
- [ ] Deep breath
- [ ] Open dashboard
- [ ] Confirm phone number is correct
- [ ] Check volume levels
- [ ] Quick mental run-through

---

## Demo Time! 🎤

### Setup (30 seconds)
- "I'm going to call our demo number"
- Open dashboard on screen
- Put phone on speaker
- Start call

### Live Demo (60 seconds)
- Let customer side play naturally
- Point to dashboard updates as they happen
- Highlight: parts ID, inventory check, auto-order

### Wrap Up (30 seconds)
- Show final appointment details
- Explain technical depth
- State the value ($30K/year savings)

### Q&A
- Stay calm
- Reference technical architecture
- Offer to show code if needed

---

## Emergency Backup Plans

### If Voice Fails
1. Play pre-recorded call
2. Manually trigger dashboard updates
3. Walk through what "would have happened"

### If Dashboard Doesn't Update
1. Refresh page (Convex should reconnect)
2. Show terminal logs instead
3. Fallback to slides

### If Nothing Works
1. Show the code (voiceAgent.ts)
2. Explain the logic
3. Show test-agent.js output
4. Focus on problem/solution story

---

## Quick Reference

### Important Files
```
convex/voiceAgent.ts     → Conversation logic
convex/parts.ts          → Parts matching
convex/appointments.ts   → Booking logic
convex/orders.ts         → Auto-ordering
```

### Key Functions
```typescript
// Main agent handler
handleVoiceInput({ transcript, callId, phoneNumber, conversationState })

// Parts lookup
findCompatibleParts({ vehicleYear, vehicleMake, vehicleModel, partCategory })

// Book appointment
createAppointment({ customerName, vehicleYear, ... })

// Auto-reorder
autoReorderLowStock({ appointmentId })
```

### Demo Phone Number
```
[Your demo number here]
```

### Convex Dashboard
```
https://dashboard.convex.dev/[your-project]
```

---

## Post-Demo

### If It Goes Well
- Smile and thank judges
- Answer questions confidently
- Get contact info for follow-up

### If It Doesn't
- Stay positive
- Emphasize the architecture
- Offer to show working test
- Learn and iterate

---

## Commands Cheat Sheet

```bash
# Start Convex dev
npx convex dev

# Test agent
node test-agent.js

# Deploy to production
npx convex deploy

# View logs
npx convex logs

# Clear all data (reset)
# (Go to Convex dashboard → Data → Delete all)
```

---

## Sponsor Talking Points

**Convex:**
"Real-time updates are critical for this use case. When the agent books an appointment, the shop needs to see it instantly. Convex made this trivial with reactive queries."

**smallest.ai:**
"Voice quality is production-ready out of the box. We can focus on the conversation logic instead of audio engineering."

**v0:**
"Generated our dashboard in 30 minutes. Saved us hours of React boilerplate so we could focus on the agent."

---

## Success Criteria

**Minimum Viable Demo:**
- ✅ Voice call works
- ✅ Agent completes one full conversation
- ✅ Dashboard shows the appointment
- ✅ You can explain the technical architecture

**Stretch Goals:**
- SMS confirmation working
- Multiple demo scenarios
- Polished UI animations
- Call analytics view

---

## You Got This! 🚀

**Remember:**
- Breathe
- Have fun
- Network
- Learn

**Key Message:**
Auto shops waste time. We built an AI that solves it. Here's the demo.

**Confidence Builders:**
- Your architecture is solid
- The problem is real
- The demo is impressive
- You know the domain

Now go win this thing! 🏆
