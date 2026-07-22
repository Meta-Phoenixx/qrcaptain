# QR Captain Fleet Management — Product Specification

> **Document type:** Customer-facing feature brief
> **Audience:** Fleet owners, charter operators, commercial fishing operators, marina managers
> **Purpose:** Define the features, roles, and value of the Fleet Management tier before development begins
> **Status:** Draft for stakeholder review — v2 (client feedback incorporated)

---

## The Problem We're Solving

Running a fleet is fundamentally different from owning a single boat. Right now, if you own five vessels, you have five separate service histories, five separate mechanics, no way to see which boat needs attention first, and no way to know if a missed oil change on your primary charter vessel is about to cost you a cancelled season.

Industry research confirms this pain: **over 30% of marina and fleet operators miss scheduled service appointments** due to manual calendars and disconnected records. Fleet owners with high capital costs per vessel face direct revenue loss when a boat goes down unexpectedly — every cancelled trip, every emergency haul-out, every rush parts order represents money that a better system would have prevented.

QR Captain Fleet Management turns reactive maintenance into proactive asset protection.

The goal is to help people responsible for multiple vessels see maintenance needs, vessel readiness, mechanic activity, service records, and upcoming costs in one place.

This brief presents the features that currently appear most valuable. It is not a final development scope, technical specification, pricing plan, or commitment that every feature listed will be included in the first release.

Stakeholder feedback will be used to:

- Confirm the most important fleet-management problems
- Identify the features that provide the greatest value
- Remove unnecessary complexity
- Separate initial capabilities from future opportunities
- Guide later product and development planning

---

## Who This Is For

### Fleet Manager / Owner
The Fleet Manager is the vessel owner responsible for the entire operation. They control the fleet — creating it, adding boats to it, authorizing mechanics, and onboarding captains. Starting the fleet from scratch is intentional: it familiarizes the Fleet Manager with how the platform works and keeps them in full control of who has access to their vessels.

Fleet Managers get:
- A dedicated fleet command center that shows the health of every vessel at a glance
- Predictive alerts before problems happen
- One-click mechanic authorization across all vessels at once
- Full financial visibility — cost per boat, upcoming expenses, fleet profitability

### Mechanic (Fleet-Tier)
A mechanic assigned to a fleet gains access to every vessel in that fleet through a single authorization. They see service priorities ranked across the fleet so they always know which vessel needs attention most urgently. Their completed work, parts logged, and hours recorded automatically feed the fleet owner's dashboard in real time.

When a captain reports an issue, the mechanic is brought into the conversation automatically — no middleman, no lost phone tag.

### Captain
The Captain role has a deliberately small footprint. Captains are not administrators — they are the eyes and ears on the water.

**What a captain can do:**
- After a scheduled charter or trip, log a post-trip note on the vessel (e.g., "Lost port engine midway through trip" or "Engines running hot — check cooling system")
- Any post-trip note automatically opens a conversation between the captain and the assigned mechanic so the issue is tracked and addressed without the fleet manager having to relay information
- If an issue arises **while underway**, the captain can send an **urgent distress notice** to both the fleet owner and the assigned mechanic simultaneously — one tap, instant alert, vessel identified
- Captains are added and removed by the Fleet Manager only — they cannot self-register

**What a captain cannot do:**
- Create or approve work orders
- Authorize other users
- View cost or billing information
- Access vessels they have not been assigned to

The Captain experience is designed to feel like filing a ride report — fast, simple, and automatically routed to the right person.

### Individual Boat Owner (Unchanged)
Existing single-vessel owners keep everything they have today. Fleet Management is an upgrade tier for operators managing multiple vessels — it does not change or replace the existing owner experience.

---

## Core Features

The intended experience is simple:

1. Open one fleet dashboard.
2. See which vessels are ready, approaching service, overdue, in maintenance, or out of service.
3. Select any number, alert, or vessel to view the supporting details.
4. Coordinate mechanics and work orders without managing each boat separately.
5. Review maintenance records and expected costs across the fleet.
6. Receive useful alerts before maintenance is missed.

The system should reduce calls, disconnected records, and manual follow-up without overwhelming the user with unnecessary operational detail.

---

### 1. Fleet Command Center (Dashboard)

The moment a Fleet Manager logs in, they see the entire fleet — not a list of boats, but a health summary that tells them exactly what needs their attention and what can wait.

**What they see at a glance:**
- **Fleet Health Score** — A single number (0–100%) representing the percentage of vessels that are fully current on all maintenance. Green means you're running clean. Red means someone has a problem.
- **Vessels In Service / In Maintenance / Out of Service** — Live status for every boat, color-coded: green (operational), yellow (in the shop), red (down).
- **Service Overdue** — Vessels that have already passed a service label threshold, ranked by how overdue they are. These need a call today.
- **Service Approaching** — Vessels coming up on their next service window in the next 14 days or 20 engine hours. These need to get on the calendar now.
- **Active Work Orders** — Every open job across the entire fleet, with which boat it's on and who's doing the work.
- **Parts Flagged for Replacement** — Components identified during inspections that are approaching end-of-life, with estimated replacement cost so there are no surprise invoices.
- **Estimated Upcoming Maintenance Cost** — The total projected spend across all open quotes and flagged parts. Know what's coming before it hits your account.
- **Fleet Utilization** — How many hours per week each vessel is running, averaged across the fleet. Identifies which boats are working hard and which are sitting idle.
- **Mechanic Coverage** — Which vessels have an assigned mechanic and which don't. No vessel should be running without someone responsible for its service.
- **Warranty Expiry Watch** — Equipment warranties expiring in the next 90 days, so you can file claims before the window closes.
- **Captain Post-Trip Reports** — Unresolved captain notes flagged for mechanic review.

Every number on this dashboard is clickable. Tap "3 Vessels Overdue" and you get the three specific boats, ranked by urgency, with their full service status.

---

### 2. Service Interval Tracking (Label-Based)

QR Captain displays service labels — not service descriptions. This is intentional and important.

Every manufacturer has different service interval requirements, and those requirements change. Getting this wrong creates liability for the vessel owner (voided engine warranties) and for the platform. So QR Captain keeps it clean and accurate:

- The platform shows the **service label** as defined by the owner or mechanic (e.g., *"250 Hr Service Due"*, *"Annual Haul-Out Due"*, *"500 Hr Transmission Service Due"*)
- It tracks **engine hours** and calculates when that label threshold will be reached based on actual usage
- When the threshold is approaching or has passed, the fleet owner is alerted
- The platform never describes what the service involves — that is the mechanic's expertise and the manufacturer's specification

This approach means service intervals are always correct, always manufacturer-accurate (because the owner or mechanic sets the label), and QR Captain is never in a position of providing maintenance advice it is not qualified to give.

---

### 3. Predictive Service Scheduling

Instead of relying on a calendar date alone, QR Captain tracks engine hours and uses them to calculate when each vessel will realistically hit its next service label threshold. A charter boat that runs 30 hours a week reaches its *250 Hr Service* on a completely different timeline than a leisure vessel that goes out twice a month.

**How it works:**
- Every time a mechanic checks in on a vessel, they log the current engine hours reading
- QR Captain learns the usage pattern for each engine on each boat
- The system calculates a predicted date based on actual usage velocity, not a generic schedule
- The fleet owner sees a ranked list: which vessel hits its service label threshold first, which is furthest away
- As usage picks up during peak season, predictions update automatically

**What this prevents:**
- Scheduling a service two weeks from now for a boat that will be overdue in four days
- Discovering mid-season that three vessels all need service at the same time
- Cancelling a charter because a service label threshold was crossed without anyone noticing

---

### 4. Engine Hours Tracking

Engine hours are the odometer of a marine vessel — but there is no dashboard you can glance at from the dock. Fleet managers have historically had to call the marina, call the captain, or wait for the mechanic to report back.

With QR Captain Fleet Management:
- Mechanics log hours directly in the app every time they are aboard
- The full history of every reading is stored per engine, per vessel
- The fleet owner can see current hours, last reading date, and trend (is this boat running more than usual?)
- Engine hour milestones automatically surface the appropriate service labels

---

### 5. GPS Tracking & Safety Accountability

GPS tracking serves two purposes: **safety** and **accountability**.

**Safety:**
- When a captain or mechanic is aboard a vessel, their location is visible to the fleet owner in real time
- If a captain sends an urgent distress notice, their exact GPS position is included in the alert — useful for coordinating assistance
- Geofencing alerts can notify the fleet owner if a vessel departs or moves outside a permitted area without authorization

**Accountability:**
- When a mechanic logs engine hours or completes a work order, their GPS location at the time of the log is recorded — confirming they were physically present on the vessel
- Post-trip captain notes are also location-stamped

GPS tracking is active only when the QR Captain app is open on a mobile device. It does not require any onboard hardware installation.

---

### 6. Captain Post-Trip Reporting & Distress Notices

**Post-Trip Report (after the charter ends):**
After a scheduled trip or charter, the captain can log a simple vessel note from the mobile app. This might be a minor observation ("starboard nav light flickering") or something more serious ("lost port engine on return leg"). Any note automatically:
- Creates a visible flag on the fleet dashboard
- Opens a direct conversation thread between the captain and the assigned mechanic
- Notifies the fleet owner that a note has been filed
- Remains open until the mechanic acknowledges and closes it

No phone calls. No lost text messages. The issue is documented, the right person is notified, and there is a record of the resolution.

**Urgent Distress Notice (while underway):**
If something goes wrong on the water, the captain can send an urgent distress notice with one tap. The alert goes to both the fleet owner and the assigned mechanic simultaneously, and includes:
- The vessel name
- The captain's current GPS location
- A short message describing the situation
- Timestamp

This is not a replacement for emergency services — captains should always contact the Coast Guard for life-safety emergencies. The distress notice is designed for mechanical emergencies, unexpected breakdowns, and situations where the fleet owner and mechanic need to know immediately.

---

### 7. Fleet Organization

Fleet Managers can organize their vessels into named fleets. If they run two separate charter operations out of different marinas, they stay separate. Racing boats can be grouped separately from rental vessels.

Each fleet has:
- A name, description, and fleet type (charter, fishing, racing, leisure, commercial)
- A roster of vessels — any vessel the owner has added can be assigned to a fleet
- One or more authorized mechanics — adding a mechanic to a fleet gives them access to every boat in it instantly
- A captain roster — captains are assigned per vessel within the fleet
- A shared service calendar showing upcoming maintenance label thresholds across all vessels

Vessels can be moved between fleets or removed at any time without affecting their history.

---

### 8. One-Click Mechanic Authorization for the Entire Fleet

With Fleet Management, the Fleet Manager authorizes a mechanic **once** for the entire fleet. Every vessel is covered immediately. New boats added to the fleet automatically inherit the authorization.

Revoking a mechanic removes their access from every vessel in the fleet in one action.

---

### 9. Vessel Status Management

Every vessel carries a live status:
- **In Service** — Operational, ready to schedule
- **In Maintenance** — Currently being worked on; do not schedule
- **Out of Service** — Down, needs immediate attention
- **Storage** — Winterized or out of rotation

Mechanics update vessel status as they start and finish work. Fleet managers see changes in real time.

---

### 10. Parts & Cost Visibility

- Every part used on a work order is logged with cost
- Parts identified as needing future replacement are flagged during inspections
- The fleet dashboard aggregates all open quotes, pending parts, and flagged replacements into a single upcoming cost estimate
- Historical cost per vessel shows which boats are high-maintenance and which are cost-efficient

This gives fleet owners the financial data to make smart decisions: when to repair vs. retire a vessel, how to price charter trips to cover operating costs, and when to budget for a large maintenance cycle.

---

### 11. Proof of Insurance — Required Per Vessel

Every vessel owner must complete a Proof of Insurance page before the vessel is fully active in the platform. This is a short, structured form — not a document upload burden.

**What it captures:**
- Insurance provider name
- Policy number
- Coverage expiration date
- Insured name (must match vessel owner)
- Optional: upload a photo or PDF of the insurance card

**How it protects everyone:**
- Fleet owners have a central record of insurance status for every vessel in the fleet
- The platform surfaces an alert when a vessel's coverage is approaching expiration
- Mechanics and the platform have a layer of documentation if a liability question ever arises
- No vessel should be operating without coverage on record

Insurance status is visible on the fleet dashboard alongside vessel status — owners see at a glance which vessels are covered and which have expiring or missing coverage.

---

### 12. Digital Vessel Records

Every vessel in the fleet maintains a complete digital profile:
- Registration and insurance documents
- Full service history with photos
- Equipment list with serial numbers and warranty dates
- Work order history and invoices
- Engine hours log
- Inspection records
- Captain post-trip notes

When a vessel is sold, the complete documented maintenance history is one export away.

---

### 13. Mobile-First for Mechanics and Captains

- Pull up a vessel's complete service history by scanning the QR code
- Log engine hours, update work order status, and add photos from dockside
- Receive push notifications when a new job is assigned
- See the full fleet assignment list ranked by service urgency
- File captain post-trip notes or send a distress notice in one tap
- Log completed work offline; it syncs when connectivity is restored

---

## Notifications and Alerts

| Alert | Who Gets It | When It Fires |
|---|---|---|
| **Service Label Approaching** | Fleet Manager, Mechanic | 20 engine hours or 14 days before threshold |
| **Service Label Overdue** | Fleet Manager, Mechanic | Threshold has been passed |
| **Captain Post-Trip Note Filed** | Fleet Manager, Mechanic | After any captain submits a vessel note |
| **Urgent Distress Notice** | Fleet Manager, Mechanic | Captain triggers distress alert while underway |
| **Work Order Complete** | Fleet Manager | Mechanic marks job finished |
| **New Quote Received** | Fleet Manager | Mechanic submits repair estimate |
| **Part Flagged for Replacement** | Fleet Manager | During inspection or work order |
| **Warranty Expiring Soon** | Fleet Manager | 90 days before equipment warranty expiry |
| **Insurance Expiring Soon** | Fleet Manager | 30 days before policy expiration date |
| **Insurance Missing** | Fleet Manager | Vessel activated without proof of insurance on file |
| **Vessel Status Changed** | Fleet Manager | Boat goes in or out of service |
| **Work Order Overdue** | Fleet Manager | Job not completed by scheduled date |

All notifications are configurable. Fleet managers choose which alerts come as push notifications, which come as emails, and which are silent dashboard updates only.

---

## Pricing Tiers

Fleet Management is offered in three tiers based on fleet size, priced per vessel per month.

| Tier | Fleet Size | Price Per Vessel / Month |
|---|---|---|
| **Starter** | 1–5 vessels | $15 / vessel |
| **Growth** | 6–10 vessels | $18 / vessel |
| **Commercial** | 11+ vessels | $20 / vessel |

*Pricing reflects the additional capabilities, support, and data storage that come with larger fleets. A 5-vessel charter operation on the Starter tier pays $75/month total. A 12-vessel commercial fleet on the Commercial tier pays $240/month total.*

Pricing is for Fleet Management features. Individual vessel owner accounts (single-boat owners) are priced separately under the existing QR Captain plan structure.

---

## What Fleet Managers Can't Do Without (The Must-Haves)

**1. Service Urgency Ranking**
Not just "which boats need service" but "which boats need service *first*." A ranked list, updated daily, that lets the fleet manager and mechanic prioritize without guesswork.

**2. Predictive Service Dates Based on Engine Hours**
Knowing that Vessel A will hit its *250 Hr Service* label in 8 days while Vessel B has 34 days left is the difference between proactive scheduling and reactive scrambling.

**3. One Number for Fleet Health**
A single Fleet Health Score that moves in response to real conditions. When it trends down, you dig in before something breaks.

**4. Cost Forecast Before the Invoice**
Upcoming maintenance costs aggregated at the fleet level — before the work is done.

**5. Real-Time Vessel Status**
The moment a mechanic starts or finishes work, the fleet status updates. No calls, no surprises, no double-booked charters on a vessel that's in the shop.

**6. Captain Communication Without the Phone Tag**
Post-trip notes that automatically connect the captain to the mechanic. Distress notices that reach the owner and mechanic instantly, with GPS location attached.

**7. Insurance on File for Every Vessel**
One place to confirm that every boat in the fleet has active coverage. Alerts before any policy lapses.

---

## How It Fits Together: A Day in the Life

**Fleet Manager — Morning Check (2 minutes)**
Opens QR Captain to the Fleet Dashboard. Fleet Health Score is 87%. Two vessels are approaching their service label threshold. One has a captain note from yesterday's charter — "engines ran hot on return." The fleet manager sees the mechanic has already opened a conversation with the captain and flagged the cooling system for inspection. No calls needed.

**Captain — End of Charter**
Docks the vessel. Opens QR Captain and logs a post-trip note: "Port engine vibration noticed at cruise speed — may need prop inspection." Submits in 30 seconds. The mechanic gets a notification. The fleet manager sees it on the dashboard. It's documented and tracked.

**Mechanic — Dockside**
Opens the app to a ranked list of three vessels by service urgency. Scans the QR code on the first vessel, logs current engine hours, reviews the captain's note from yesterday, and starts a work order for the cooling system. Marks it complete when done. Fleet owner's dashboard updates instantly. GPS confirms time on vessel.

**Fleet Manager — Planning for Next Month**
Opens the cost forecast. Sees $3,200 in upcoming scheduled maintenance and $800 in flagged parts across the fleet. One vessel's insurance policy expires in 22 days — alert already sent, renewal is in progress. Adjusts charter pricing for next month to ensure the maintenance budget is covered. No surprises.

---

## Roles Summary

| Role | What They See | What They Can Do |
|---|---|---|
| **Fleet Manager** | Fleet dashboard, all vessels, all work orders, cost forecast, service predictions, insurance status | Create and manage fleets, add vessels, authorize mechanics, add captains, approve quotes, view all history |
| **Mechanic (Fleet)** | All vessels they are authorized for, ranked by service urgency, captain notes | Log engine hours, create and update work orders, submit quotes, flag parts, update vessel status, respond to captain notes |
| **Captain** | Their assigned vessel(s), their own filed notes | File post-trip notes, send urgent distress notices |
| **Individual Owner** | Their own vessel(s), work orders, their mechanic | Request service, view history, rate mechanics (unchanged from today) |
| **Admin** | Everything | Full platform access and management |

---

## Open Items — Resolved from Client Review

| Question | Decision |
|---|---|
| Fleet size tiers | Starter (1–5), Growth (6–10), Commercial (11+) |
| Pricing | $15 / $18 / $20 per vessel per month by tier |
| Who creates the fleet | Fleet Manager / Owner — always. Familiarizes them with the platform. |
| Captain role | Small footprint: post-trip notes + urgent distress only. Added by Fleet Manager. |
| GPS tracking | Yes — mobile GPS while app is open. Safety + mechanic accountability. |
| Service interval descriptions | Label-only (e.g., "250 Hr Service Due") — never describe what the service involves. Liability protection. |
| Proof of insurance | Required per vessel. Short form. Fleet-level visibility. Expiry alerts. |

## Remaining Open Items

1. **Digital waivers** — Should the platform support e-signature liability waivers tied to specific trips or charters? Highly valued by charter operators for insurance and dispute protection.

2. **Weather broadcast** — Should the system support one-tap SMS/email broadcast to all passengers booked on a trip when weather forces a cancellation? Requires a booking/passenger module (not in current QR Captain scope).

3. **Offline distress** — If the captain has no data signal while underway, the distress notice cannot be sent. Should the platform integrate with satellite messaging (e.g., Garmin inReach) for true offshore coverage, or is cellular-only acceptable for the initial release?
