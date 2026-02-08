# QR Captain — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** February 7, 2026
**Status:** Draft

---

## 1. Executive Summary

QR Captain is a vessel maintenance tracking platform that connects boat owners with marine mechanics through QR-code-enabled service records. Owners register their vessels, generate unique QR codes, and maintain a complete digital maintenance history. Mechanics scan QR codes to instantly access a vessel's service records, document work with photos and parts, and build their professional reputation through verified ratings.

The platform consists of a Next.js web application and a React Native (Expo) mobile app, backed by Convex for real-time data, authentication, and file storage.

---

## 2. Problem Statement

### For Boat Owners
- **Fragmented maintenance records** — paper logs, scattered receipts, and inconsistent record-keeping make it difficult to track a vessel's full service history.
- **Finding trusted mechanics** — no centralized, reputation-based marketplace exists for marine service professionals.
- **Transparency** — limited visibility into work performed, parts used, and pricing fairness.

### For Marine Mechanics
- **No access to vessel history** — mechanics must rely on owner recall or physical inspections, leading to missed issues and redundant diagnostics.
- **Reputation building** — no standardized system to showcase verified work history, certifications, and customer satisfaction.
- **Documentation burden** — manual, disconnected documentation of parts, labor, and warranty information.

### For the Industry
- **No digital standard** — the marine service industry lacks a unified digital platform for maintenance tracking comparable to what exists in automotive.

---

## 3. Product Vision

> Make every vessel's maintenance history instantly accessible via a QR code, and every marine mechanic's reputation verifiably transparent — creating a trusted ecosystem for vessel care.

---

## 4. Target Users

### 4.1 Boat Owners (Primary)
- Recreational and commercial boat owners
- Fleet managers with multiple vessels
- Boat buyers seeking verifiable maintenance histories

### 4.2 Marine Mechanics
- Independent marine mechanics and technicians
- Marine service companies and boatyards
- Mobile marine mechanics

### 4.3 Administrators
- Platform administrators managing users, announcements, help content, and system settings

---

## 5. User Roles & Permissions

| Capability | Owner | Mechanic | Admin |
|---|---|---|---|
| Register vessels | Yes | No | No |
| Generate/print QR codes | Yes | No | No |
| Manage equipment manifests | Yes | No | No |
| Request work orders | Yes | No | No |
| Approve/decline quotes | Yes | No | No |
| Rate mechanics (wrench rating) | Yes | No | No |
| Scan QR codes | No | Yes | No |
| Request vessel access | No | Yes | No |
| Create/manage work orders | No | Yes | No |
| Submit quotes | No | Yes | No |
| Document parts & photos | No | Yes | No |
| Rate owners (star rating) | No | Yes | No |
| View service history | Yes (own) | Yes (authorized) | Yes (all) |
| Send/receive messages | Yes | Yes | Yes |
| Manage announcements | No | No | Yes |
| Manage help guides | No | No | Yes |
| Manage users | No | No | Yes |
| Manage app settings | No | No | Yes |

---

## 6. Core Features

### 6.1 Vessel Management (Owner)

**Description:** Owners register vessels with detailed information and receive a unique, scannable QR code linked to the vessel's digital maintenance record.

**Requirements:**
- Register a vessel with name, type, make, model, year, length, hull ID, registration number, and home port
- Upload vessel photos (stored via Convex file storage)
- Generate a unique QR code per vessel for display on the boat
- View, edit, and delete vessels
- View complete vessel dashboard with service history, equipment, and active work orders

### 6.2 Equipment Manifest (Owner)

**Description:** A categorized inventory of all onboard equipment with service tracking, warranty info, and condition monitoring.

**Requirements:**
- 15 equipment categories: Propulsion, Electrical, Electronics, Plumbing, Fuel System, HVAC, Deck Hardware, Safety Equipment, Steering, Hull & Structure, Canvas & Covers, Galley, Entertainment, Rigging, Tender & Dinghy
- Track per item: name, manufacturer, model, serial number, install date, warranty expiration, condition status, notes
- Service interval tracking (date-based and engine-hours-based)
- Condition status indicators: good, fair, needs_attention
- Upload photos per equipment item
- Service reminders surfaced on the home landing page

### 6.3 QR Code Scanning (Mechanic)

**Description:** Mechanics scan a vessel's QR code to request access and view the vessel's full maintenance history.

**Requirements:**
- Web scanning via `html5-qrcode` library
- Mobile scanning via `expo-camera`
- Scan resolves to the vessel's ID and triggers an access request workflow
- After authorization, mechanic can view full vessel details, equipment manifest, and service history

### 6.4 Vessel Access Authorization

**Description:** A permission layer that governs which mechanics can access which vessels.

**Requirements:**
- Mechanic requests access by scanning QR or searching vessel
- Owner receives notification and approves or denies
- Access can be revoked at any time by the owner
- Access types: one-time or ongoing
- Mechanic sees list of all authorized vessels

### 6.5 Work Order System

**Description:** The end-to-end workflow for requesting, quoting, performing, and completing marine service work.

**Lifecycle:**
1. `quote_requested` — Owner creates a work order request with description, urgency, and preferred schedule
2. `quoted` — Mechanic responds with a quote (labor hours, hourly rate, parts estimate, total)
3. `declined` — Mechanic declines the request (with optional reason)
4. `in_progress` — Owner accepts quote; mechanic begins work
5. `completed` — Mechanic marks work as finished with documentation
6. `cancelled` — Either party cancels the work order

**Requirements:**
- Owner can set urgency level (low, medium, high, emergency)
- Mechanic submits structured quotes with labor hours, rate, and parts breakdown
- Owner accepts or negotiates quotes
- Photo documentation: before, during, and after photos attached to work orders
- Parts tracking: each part logged with name, part number, manufacturer, serial number, warranty info, cost, and optional photo
- Work order history maintained indefinitely per vessel

### 6.6 Quote System

**Description:** Structured quoting embedded within the work order flow.

**Requirements:**
- Mechanic provides: estimated labor hours, hourly rate, parts cost estimate, total estimate, and notes
- Owner can accept or request revision
- Quote history preserved for transparency
- Quote tied to a specific work order

### 6.7 Parts Tracking & Database

**Description:** A searchable parts catalog and per-work-order parts documentation.

**Requirements:**
- Searchable parts database with autocomplete suggestions
- Add parts to work orders: name, part number, manufacturer, serial number, warranty months, cost, quantity
- Upload photos of installed parts
- Parts history per vessel accessible to owners and authorized mechanics
- Admin and mechanic contributions grow the shared parts database over time

### 6.8 Dual Rating System

**Description:** A bidirectional rating system where owners rate mechanics and mechanics rate owners, fostering mutual accountability.

**Mechanic Ratings (by Owners):**
- Visual: wrench icons (1–5)
- Categories: quality of work, communication, professionalism, value for money
- Written review with optional response from mechanic
- Tied to a specific completed work order

**Owner Ratings (by Mechanics):**
- Visual: star icons (1–5)
- Categories: communication, preparedness, payment timeliness, respect
- Written review
- Tied to a specific completed work order

**Requirements:**
- Ratings only available after work order completion
- Aggregate scores displayed on profiles
- Rating reminders sent via notifications
- Ratings are public and contribute to directory ranking

### 6.9 Mechanic Directory

**Description:** A searchable, filterable directory of registered marine mechanics.

**Requirements:**
- Browse mechanics with filters: service area, specialization, availability, rating
- Mechanic profiles display: company name, bio, certifications, service areas, hours of operation, availability status, ratings, jobs completed, response time
- Availability statuses: available, limited, at_capacity, unavailable
- "Featured Mechanics" algorithm surfaces top-rated, responsive, available mechanics
- Preferred mechanics list for owners (saved favorites)

### 6.10 Messaging

**Description:** Direct messaging between owners and mechanics for communication around service requests.

**Requirements:**
- One-to-one messaging between owners and mechanics
- Messages linked to vessel and/or work order context
- Real-time delivery via Convex subscriptions
- Notification on new messages

### 6.11 Notifications

**Description:** An in-app notification system to keep users informed of important events.

**Notification Types:**
- Access requests, approvals, and denials
- Work order lifecycle events (new request, quote submitted, accepted, completed)
- New messages
- Rating reminders
- Onboarding reminders (cron-based at 9 AM and 6 PM UTC)
- Admin announcements

**Requirements:**
- In-app notification bell with unread count
- Mark as read / mark all as read
- Notification throttling to prevent spam
- Notification preferences (future enhancement)

### 6.12 Announcements System (Admin)

**Description:** Admin-managed announcements broadcast to users based on role.

**Requirements:**
- Announcement types: info, feature, maintenance, tip, urgent
- Target by role: owner, mechanic, admin, or all
- Pin important announcements to top of feed
- Set optional expiration date
- Users can dismiss non-pinned announcements
- Announcements displayed on the home landing page

### 6.13 Help Center & Guides (Admin)

**Description:** In-app documentation and help content organized by category and role.

**Requirements:**
- Categories: getting started, vessels, work orders, mechanics, equipment, billing, troubleshooting
- Content filtered by user role
- Markdown-formatted content
- Sort ordering for display priority
- Accessible from landing page and dedicated `/help` route

### 6.14 Admin Control Panel

**Description:** System administration tools for platform management.

**Requirements:**
- Dashboard with system stats (total users, vessels, work orders, recent signups)
- User management: view users, promote to admin
- Announcement management: CRUD operations
- Help guide management: CRUD operations
- App settings: configurable system-wide settings (notification preferences, work order rules, mechanic settings, owner settings)

### 6.15 Landing Page / Home

**Description:** A role-adaptive home screen that serves as the primary hub after login.

**Requirements:**
- **All roles:** Announcements feed, help guides, navigation to key features
- **Owners:** Welcome stats (vessel count, active work orders, pending quotes), quick actions (request service, find mechanic, add vessel), featured mechanics, service reminders, activity feed
- **Mechanics:** Stats (active jobs, completed this month, rating), quick actions (view work orders, update availability, view profile), pending quote requests, activity feed
- **Admins:** System stats, quick actions (manage users, create announcement, settings), announcement management, recent activity

---

## 7. Technical Architecture

### 7.1 Overview

QR Captain is built as a **Turborepo monorepo** with three main packages:

```
qrcaptian_v1/
├── apps/
│   ├── web/           # Next.js 14 (App Router)
│   └── mobile/        # React Native (Expo ~52.0)
├── convex/            # Convex backend (shared)
└── packages/
    └── shared/        # Shared types, constants, validations
```

### 7.2 Frontend — Web

| Attribute | Detail |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI System | Custom glass morphism design system |
| Icons | Lucide React |
| QR Scanning | html5-qrcode |
| QR Generation | qrcode.react |
| Image Cropping | react-image-crop |
| Theme | Dark mode support via custom theme provider |

**Key Routes:**
- `/` — Root (redirects to `/home` for authenticated users, sign-in for unauthenticated)
- `/home` — Landing page (role-adaptive)
- `/mechanics` — Mechanic directory
- `/help` — Help center
- `/design-system` — Design system showcase (development)

### 7.3 Frontend — Mobile

| Attribute | Detail |
|---|---|
| Framework | React Native with Expo (~52.0) |
| Navigation | Expo Router (tab-based) |
| Language | TypeScript |
| QR Scanning | expo-camera |
| QR Generation | react-native-qrcode-svg |
| Token Storage | Expo Secure Store |

**Tabs:**
- Dashboard (index)
- My Vessels (owners)
- Scan QR (mechanics)
- Work Orders
- Profile

### 7.4 Backend — Convex

| Attribute | Detail |
|---|---|
| Platform | Convex (BaaS) |
| Auth | Convex Auth with Password provider |
| Database | Convex document database (real-time) |
| File Storage | Convex Storage (images) |
| Scheduling | Convex crons (onboarding reminders) |
| HTTP | Convex HTTP routes |

**Database Tables:**
- `users` — Extended profiles with role-specific fields
- `vessels` — Boat registration with QR code references
- `vesselEquipment` — Equipment catalog (15 categories)
- `workOrders` — Work order lifecycle
- `workOrderParts` — Parts per work order
- `workOrderPhotos` — Before/during/after photos
- `partsDatabase` — Shared parts catalog
- `mechanicRatings` — Owner-to-mechanic ratings
- `ownerRatings` — Mechanic-to-owner ratings
- `mechanicAuthorizations` — Vessel access permissions
- `accessRequests` — Mechanic access requests
- `preferredMechanics` — Owner favorites
- `mechanicMetrics` — Cached performance metrics
- `messages` — Direct messaging
- `notifications` — In-app notifications
- `announcements` — Admin announcements
- `announcementDismissals` — Dismissal tracking
- `helpGuides` — Documentation content
- `appSettings` — System settings

### 7.5 Shared Package

- `constants.ts` — Shared constants (equipment categories, status enums, etc.)
- `validations.ts` — Input validation schemas
- `utils.ts` — Common utility functions

### 7.6 Development Tooling

| Tool | Purpose |
|---|---|
| Turborepo | Monorepo orchestration |
| pnpm 9.0.0 | Package management |
| Node.js >=18 | Runtime requirement |
| TypeScript | Type safety across all packages |

---

## 8. Design System

### 8.1 Visual Identity

- **Primary Color:** Sky blue (`#0284c7`) — marine-inspired
- **Dark Accent:** Deep navy (`#0c4a6e`)
- **UI Style:** Glass morphism (translucent cards, blur effects, subtle borders)
- **Dark Mode:** Full dark theme support
- **Responsive:** Mobile-first responsive design

### 8.2 Component Library

- Glass-styled cards, modals, and panels (`glass.tsx`)
- Consistent icon set via Lucide React
- Card-based layouts throughout
- Role-adaptive conditional rendering
- Urgency/status color coding (red/yellow/green)

---

## 9. User Flows

### 9.1 Owner — Register Vessel & Generate QR

```
Sign Up → Select "Owner" role → Onboarding → Add Vessel (name, details, photos)
→ QR Code Generated → Print/Display QR on Vessel
```

### 9.2 Mechanic — Scan QR & Service Vessel

```
Sign Up → Select "Mechanic" role → Complete Profile (certs, service areas)
→ Scan QR Code on Vessel → Request Access → Owner Approves
→ View Vessel History → Create Work Order / Submit Quote
→ Perform Work → Document (photos, parts) → Complete Work Order
```

### 9.3 Owner — Request Service

```
Landing Page → "Request Service" → Select Vessel → Describe Issue (urgency, details)
→ Work Order Created (quote_requested) → Mechanic Submits Quote
→ Review Quote → Accept → Work Performed → Review & Rate Mechanic
```

### 9.4 Mechanic — Complete Work Order

```
View Work Orders → Select Job → Update Status to "In Progress"
→ Add Before Photos → Perform Work → Add Parts (with serial/warranty)
→ Add During/After Photos → Mark Complete → Rate Owner
```

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Real-time data updates via Convex subscriptions (no polling)
- Optimized database queries with comprehensive indexing
- Mobile-optimized assets and lazy loading

### 10.2 Security
- Role-based access control (RBAC) enforced at the database query/mutation level
- Vessel access authorization system prevents unauthorized data access
- Secure token storage on mobile (Expo Secure Store)
- Environment-variable-based configuration for secrets

### 10.3 Reliability
- Convex provides managed infrastructure with automatic scaling
- Cron jobs for time-sensitive operations (reminders)
- Notification throttling to prevent overload

### 10.4 Usability
- Mobile-first responsive design
- Role-adaptive interfaces — each role sees only relevant features
- Onboarding flows for new users
- In-app help center with role-filtered content
- Consistent glass morphism design language

---

## 11. Future Enhancements

### High Priority
- **Push notifications** — Mobile push via Expo for critical events
- **Payment integration** — In-app payments for services
- **PDF export** — Downloadable vessel maintenance reports
- **Multi-image upload** — Batch photo uploads for work documentation

### Medium Priority
- **Weather widget** — Local marine weather on the landing page (external API)
- **Onboarding tour** — Guided walkthrough for new users
- **Dashboard customization** — Drag-and-drop widget arrangement
- **Seasonal tips engine** — Time-based maintenance tips (winterization, spring commissioning)
- **Advanced search** — Full-text search across vessels, work orders, and parts

### Low Priority
- **Fleet analytics** — Aggregate maintenance cost and frequency dashboards for multi-vessel owners
- **Insurance integration** — Share verified maintenance records with insurers
- **Boat sale transfer** — Transfer vessel ownership with complete history
- **Public mechanic profiles** — SEO-indexed mechanic pages for discoverability
- **API access** — Third-party integrations for marinas, boatyards, and fleet management systems

---

## 12. Success Metrics

| Metric | Target |
|---|---|
| Registered vessels | Track month-over-month growth |
| Active mechanics | Track month-over-month growth |
| Work orders completed | Track weekly/monthly volume |
| Average mechanic rating | Maintain above 4.0/5.0 |
| QR scans per month | Track adoption of QR workflow |
| User retention (30-day) | Target > 60% |
| Average time to quote | Target < 24 hours |
| Mobile vs. web usage split | Monitor platform preference |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **Vessel** | A registered boat or watercraft in the system |
| **Equipment Manifest** | The categorized inventory of all equipment on a vessel |
| **Work Order** | A service request and its full lifecycle from quote to completion |
| **QR Code** | A unique scannable code linked to a specific vessel's records |
| **Mechanic Authorization** | Permission granted by an owner for a mechanic to access vessel data |
| **Wrench Rating** | The 1–5 rating scale owners use to rate mechanics |
| **Star Rating** | The 1–5 rating scale mechanics use to rate owners |
| **Preferred Mechanic** | A mechanic saved to an owner's favorites list |
| **Mechanic Metrics** | Cached performance data (response time, completion rate, ratings) |

---

*This document captures the current state of QR Captain as implemented, plus identified future enhancements. It should be updated as features are added or requirements evolve.*
