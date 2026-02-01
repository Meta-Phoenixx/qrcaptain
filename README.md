# QR Captain ⚓

Complete vessel maintenance tracking for boat owners and marine mechanics.

## Overview

QR Captain allows boat owners to track all maintenance work done on their vessels. Marine mechanics can scan QR codes on boats to access the complete service history and document their work with photos, parts, and warranty information.

### Features

- **For Boat Owners**
  - Register and manage your vessels
  - Generate unique QR codes for each vessel
  - Track complete maintenance history
  - Rate and review mechanics
  - Catalog all equipment on your vessel

- **For Marine Mechanics**
  - Scan vessel QR codes to access history
  - Document work with before/during/after photos
  - Track parts with serial numbers and warranties
  - Build reputation through owner ratings

- **For Administrators**
  - Manage all users and vessels
  - View system analytics
  - Monitor platform activity

## Tech Stack

- **Mobile**: React Native with Expo (iOS & Android)
- **Web**: Next.js 14 with App Router
- **Backend**: Convex (real-time database, auth, file storage)
- **Styling**: Tailwind CSS (web), React Native StyleSheet (mobile)

## Project Structure

```
qrcaptain/
├── apps/
│   ├── mobile/          # React Native (Expo) app
│   └── web/             # Next.js web app
├── convex/              # Convex backend
│   ├── schema.ts        # Database schema
│   ├── users.ts         # User queries/mutations
│   ├── vessels.ts       # Vessel queries/mutations
│   ├── workOrders.ts    # Work order queries/mutations
│   ├── ratings.ts       # Rating queries/mutations
│   └── storage.ts       # File storage handlers
├── packages/
│   └── shared/          # Shared utilities and types
└── package.json         # Monorepo configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Convex account (free at [convex.dev](https://convex.dev))
- Expo Go app (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/qrcaptain.git
   cd qrcaptain
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Convex**
   ```bash
   cd convex
   npx convex dev
   ```
   This will prompt you to create a new Convex project and configure authentication.

4. **Configure environment variables**

   For the web app (`apps/web/.env.local`):
   ```
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   ```

   For the mobile app (`apps/mobile/.env`):
   ```
   EXPO_PUBLIC_CONVEX_URL=your_convex_deployment_url
   ```

5. **Run the development servers**

   In separate terminals:
   ```bash
   # Terminal 1: Convex backend
   pnpm dev:convex

   # Terminal 2: Web app
   pnpm dev:web

   # Terminal 3: Mobile app
   pnpm dev:mobile
   ```

### Running on Mobile

1. Install the **Expo Go** app on your iOS or Android device
2. Start the mobile development server: `pnpm dev:mobile`
3. Scan the QR code in the terminal with your device

## Environment Variables

| Variable | Description | Used In |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Web |
| `EXPO_PUBLIC_CONVEX_URL` | Convex deployment URL | Mobile |

## Database Schema

The app uses Convex with the following main tables:

- `users` - User profiles with roles (admin, owner, mechanic)
- `vessels` - Registered boats with QR codes
- `vesselEquipment` - Equipment catalog per vessel
- `workOrders` - Maintenance work documentation
- `workOrderParts` - Parts used in work orders
- `workOrderPhotos` - Before/during/after photos
- `ratings` - Owner ratings of mechanics
- `mechanicAuthorizations` - Which mechanics can access which vessels

## Development

### Available Scripts

```bash
pnpm dev          # Run all apps in development
pnpm dev:web      # Run web app only
pnpm dev:mobile   # Run mobile app only
pnpm dev:convex   # Run Convex backend
pnpm build        # Build all apps
pnpm lint         # Run linting
pnpm type-check   # Run TypeScript checks
```

### Code Structure

- All Convex functions have role-based access control
- Mobile and web share the same Convex backend
- Shared utilities in `packages/shared`

## Deployment

### Web (Vercel)
1. Connect your GitHub repo to Vercel
2. Set `NEXT_PUBLIC_CONVEX_URL` environment variable
3. Deploy from the `apps/web` directory

### Mobile (Expo)
1. Set up Expo Application Services (EAS)
2. Configure `eas.json` for builds
3. Run `eas build` for iOS/Android builds

### Backend (Convex)
1. Run `npx convex deploy` from the `convex` directory
2. Convex handles hosting automatically

## License

MIT License - see LICENSE file for details.
