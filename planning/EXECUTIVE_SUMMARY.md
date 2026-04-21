# QR Captain - Executive Summary
**Project Status: Beta Launch Ready (Q2 2026)**  
**Last Updated: April 21, 2026**

---

## 1. Project Overview

**QR Captain** is a comprehensive vessel maintenance tracking platform designed for boat owners and marine mechanics. The platform enables users to:
- Scan QR codes on vessels to access complete maintenance history
- Document maintenance work with photos, parts lists, and warranty information
- Track work order quotes and completion status
- Build mechanic directories and ratings
- Manage vessel equipment manifests and service schedules

**Target Users:**
- Boat owners (vessel managers)
- Professional marine mechanics
- Fleet operators
- Marine service businesses

**Partnership:** Walden Marine x QR Captain (co-branding on public-facing features)

---

## 2. Technology Stack

### Architecture
**Turborepo monorepo** with three integrated applications:
- **Web App:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Mobile App:** React Native + Expo with native routing
- **Backend:** Convex (real-time database, authentication, serverless functions, file storage)
- **Shared:** TypeScript types and validation schemas

### Infrastructure
- **Authentication:** Convex Auth (@convex-dev/auth) with password + OTP via Resend
- **Email Service:** Resend API for transactional emails
- **Deployment:** Vercel (web), Expo (mobile), Convex Cloud (backend)
- **Domain:** theqrcaptain.com

### Brand Identity
- **Color Palette:** Custom "captain" palette (sky-blue family)
- **Typography:** Ubuntu (headings) + Inter (body)
- **Design System:** Glassmorphism UI with dark theme support

---

## 3. User Roles & Access Control

Three role-based user tiers with enforced permissions across all Convex functions:

| Role | Use Case | Key Permissions |
|------|----------|-----------------|
| **Admin** | Platform management & oversight | System stats, settings, announcements, user management, donations/raffle tracking |
| **Owner** | Boat owner/fleet manager | Create vessels, request work, view history, rate mechanics, manage access |
| **Mechanic** | Marine service professional | Submit quotes, track work orders, request vessel access, manage schedule, accept ratings |

---

## 4. Completed Features

### 4.1 Public-Facing Features
✅ **Marketing Landing Page**
- Dark glassmorphism design (reflect.app style)
- Hero section with animated gradients
- Feature showcase grid (QR scanning, real-time tracking, equipment manifest, verified history)
- Owner-specific features (6 cards)
- Mechanic-specific features (6 cards)
- Countdown timer to launch (June 11, 2026) with purple glow animation
- Beta program signup section
- Responsive mobile/desktop layouts

✅ **Waitlist Signup Page**
- Email collection with role interest (Owner / Mechanic / Both)
- Live waitlist count display
- Confirmation emails via Resend
- Admin tracking in control panel

✅ **Donation Page** (Cass Walden missionary aviation partnership)
- 4 preset donation tiers ($25, $50, $100, $250)
- Custom amount input
- Donor information form (name, email, phone, message)
- Live donation tally showing:
  - Total raised
  - Donor count
  - 90/10 cause split breakdown
- VIP access incentive messaging
- Partnership branding (Walden Marine + QR Captain)
- Confirmation emails with VIP promise
- Admin panel with edit/delete capabilities

✅ **Raffle Entry Page** (Safety Harbor Slam 50/50 raffle - kept unlinked)
- Ticket tier selection (single/popular/value/bigdog)
- Live pot tracking with 50/50 winner/cause split
- Participant registration
- Confirmation emails
- Admin panel with ticket count editing
- Partnership logos and flyer

### 4.2 Core Platform Features

✅ **Vessel Management**
- Create/register vessels
- Equipment manifest (15 equipment categories)
- QR code generation and scanning
- Vessel access permissions for mechanics

✅ **Work Order System**
- Create work order requests (owners)
- Quote request/submission workflow
- Work order lifecycle (quote_requested → quoted → in_progress → completed/declined/cancelled)
- Status tracking and updates
- Photo attachments (before/during/after)
- Parts list management
- Warranty tracking

✅ **Rating System**
- Mechanics rated by owners (⭐ star ratings)
- Owners rated by mechanics (🔧 wrench ratings)
- Rating history and metrics
- Mechanic performance dashboard

✅ **Mechanic Directory**
- Search and discovery
- Profile with ratings and service history
- Preferred mechanics list
- Access request workflow

✅ **Messaging System**
- Direct messaging between users
- Conversation history
- Real-time updates

✅ **Notifications**
- 15+ notification types
- Work order updates
- Rating notifications
- Message alerts
- Access requests
- Announcement broadcasts

✅ **Admin Control Panel**
- **Overview Tab:** System statistics (users, vessels, work orders)
- **Settings Tab:** Configurable system parameters (notifications, mechanics, owners, work orders)
- **Announcements Tab:** Broadcast messages to all users
- **Donations Tab:** Donation tracking with edit/delete & notification emails
- **Waitlist Tab:** Signup management and role analytics
- **Raffle Tab:** Entry tracking with ticket count editing & notification emails
- Moved from modal to dedicated `/admin` page

### 4.3 Authentication & Security
✅ **User Authentication**
- Password-based auth with OTP verification
- Email-based password reset
- Role-based access control (RBAC) on all backend functions
- Session management

✅ **Email Verification & Notifications**
- Confirmation emails for:
  - Account signup
  - Waitlist signup
  - Donations (with VIP access messaging)
  - Raffle entries
  - Donation/raffle changes (admin updates)
  - Donation/raffle deletion notifications

---

## 5. Features by User Role

### Boat Owners
- Register vessels with equipment
- Request maintenance work
- View service history
- Rate mechanics
- Manage mechanic access
- Track work order progress
- Direct messaging with mechanics

### Mechanics
- Browse available work
- Submit quotes
- Update work order status
- Request vessel access
- Build rating portfolio
- View performance metrics
- Accept/decline jobs

### Admins
- Monitor system health (users, vessels, work orders)
- Configure system settings
- Broadcast announcements
- Track fundraising (donations, raffle)
- Manage waitlist signups
- Edit/delete fundraising entries with notification emails

---

## 6. Marketing & Fundraising Integration

✅ **Public Landing Page** (theqrcaptain.com/)
- Glassmorphic design with animated hero
- Feature education
- Call-to-action: "Join Waitlist" button
- "Donate" button (gold) with heart icon
- Countdown timer (Q2 2026 launch)

✅ **Waitlist System**
- Pre-launch interest capture
- Role segmentation (owner/mechanic/both)
- Email confirmation
- Real-time count display on landing page

✅ **Donation Program** (theqrcaptain.com/donate)
- Supporting Cass Walden's missionary aviation training
- 90% to cause, 10% operational
- VIP platform access as incentive
- Email confirmation with VIP messaging

✅ **Raffle Program** (Safety Harbor Slam 50/50)
- Partnership with Walden Marine
- 50/50 winner/cause split
- Live pot tracking
- Ticket tier pricing system

---

## 7. Recent Updates (Current Sprint)

**Admin Panel Enhancements:**
- ✅ Inline editing for donation amounts
- ✅ Inline editing for raffle ticket counts
- ✅ Delete confirmation workflow
- ✅ Automated notification emails on changes
- ✅ Moved from modal to dedicated `/admin` page with back navigation
- ✅ Full-page layout with sticky header

**Email Notifications Added:**
- `sendDonationUpdateNotification` — when admin changes amount
- `sendDonationDeleteNotification` — when entry is removed
- `sendRaffleUpdateNotification` — when admin changes ticket count
- `sendRaffleDeleteNotification` — when entry is removed

---

## 8. Deployment Status

| Environment | Status | URL |
|---|---|---|
| **Production Web** | ✅ Live | theqrcaptain.com |
| **Production Backend** | ✅ Live | Convex Cloud (striped-greyhound-919) |
| **Production Mobile** | 📋 Ready for submission | Expo (not yet in app stores) |
| **Admin Email** | ✅ Verified | admin@meta-phoenix.io |
| **Email Service** | ✅ Verified | Resend (theqrcaptain.com domain) |

**Latest Deployment:** `fbf564a` (Admin panel enhancements)

---

## 9. Database Schema

**Core Tables:**
- `users` — Account records with role (admin/owner/mechanic)
- `vessels` — Registered boats with QR codes
- `vesselEquipment` — Equipment categories per vessel
- `workOrders` — Job requests and tracking
- `workOrderParts` — Parts used in jobs
- `workOrderPhotos` — Before/during/after images
- `mechanicRatings` — Owner ratings of mechanics
- `ownerRatings` — Mechanic ratings of owners
- `preferredMechanics` — Owner's mechanic directory
- `mechanicMetrics` — Cached performance stats
- `notifications` — User alerts (15 types)
- `messages` — Direct messaging
- `announcements` — Admin broadcasts
- `helpGuides` — In-app documentation
- `appSettings` — Configurable system parameters
- **`waitlistSignups`** — Pre-launch signups
- **`donationEntries`** — Donation records
- **`raffleEntries`** — Raffle participation

---

## 10. Outstanding Items & Known Issues

### Minor
- Mobile app not yet submitted to app stores (ready for submission)
- Some CSS animations optimized but not extensively tested on older browsers
- Help guides not fully populated (placeholder structure exists)

### None Critical ⚓
Platform is feature-complete for Q2 2026 beta launch.

---

## 11. Development Roadmap - Next Phase

### Immediate Post-Launch (Q2 2026)
- Mobile app store submissions (iOS App Store, Google Play)
- Beta user onboarding & support
- In-app help documentation completion
- Analytics dashboard for admins
- Push notifications for mobile

### Phase 2 (Q3 2026)
- Advanced search & filtering
- Scheduled maintenance reminders
- Parts inventory tracking
- Invoice/billing integration
- Payment processing for work orders
- API documentation for third-party integrations

### Phase 3 (Q4 2026+)
- Multi-vessel dashboard
- Fleet analytics
- Mechanic team management
- Warranty claim integration
- Document storage (repair records, certifications)
- Compliance reporting

### Future Considerations
- Vessel insurance integration
- Marine supply ordering
- Seasonal maintenance planning
- Fuel/performance tracking
- Environmental impact metrics

---

## 12. Client Action Items

### Required for Launch
1. ✅ Confirm countdown timer target date (June 11, 2026)
2. ✅ Review and approve landing page messaging
3. ✅ Confirm donation page 90/10 split and VIP incentive
4. ✅ Admin email access (admin@meta-phoenix.io)
5. ✅ Domain DNS/email verification (complete)

### Recommended Before Beta
1. Define beta user cohort (how many? which mechanics?)
2. Create onboarding/training materials
3. Plan community launch event (tie to countdown timer)
4. Establish support/feedback channel
5. Review app store submission requirements

### Strategic Decisions
1. **Mobile Strategy:** Release web first, mobile in app stores after Q2?
2. **Beta Incentives:** Offer free/discounted premium features to beta users?
3. **Expansion:** Plan for boat types beyond saltwater fishing (powerboats, sailboats, etc.)?
4. **Partner Growth:** Walden Marine as primary launch partner, others to follow?
5. **Geographic Focus:** Launch region-specific first or nationwide?

---

## 13. Metrics to Track

**Awareness & Signup:**
- Waitlist signup rate
- Landing page traffic
- Conversion (visitors → waitlist)

**Fundraising:**
- Donation total & average gift
- Donor count
- Raffle revenue

**Engagement:**
- Active users (daily/weekly/monthly)
- Work orders created & completed
- Ratings submitted
- Messaging volume

**Quality:**
- App crashes/errors
- Support ticket volume
- User satisfaction (NPS)

---

## 14. Contact & Support

**Platform Admin:** admin@meta-phoenix.io  
**Email Support:** support@theqrcaptain.com (configure in Resend)  
**Repository:** https://github.com/Meta-Phoenixx/qrcaptain  
**Backend Deployment:** Convex Cloud (striped-greyhound-919)  

---

**Next Steps:** Schedule kickoff meeting to review roadmap, confirm beta launch strategy, and align on Phase 2 priorities.
