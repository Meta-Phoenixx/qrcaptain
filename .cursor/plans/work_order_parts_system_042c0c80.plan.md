---
name: Work Order Parts System
overview: Build the work order creation and editing UI with a smart parts entry system featuring autocomplete, recently used parts, and vessel-specific history. Start with a minimal seed of ~20-30 common marine parts.
todos:
  - id: schema
    content: Add partsDatabase table to convex/schema.ts with search index
    status: completed
  - id: parts-backend
    content: Create convex/parts.ts with search, recent, vessel history queries
    status: completed
  - id: seed-data
    content: Create convex/seedParts.ts with ~25 common marine parts
    status: completed
  - id: update-workorders
    content: Update convex/workOrders.ts addPart to auto-catalog new parts
    status: completed
  - id: parts-autocomplete
    content: Create parts-autocomplete.tsx component with search and keyboard nav
    status: completed
  - id: parts-entry
    content: Create parts-entry.tsx with recent parts, vessel history, and manual entry
    status: completed
  - id: work-order-form
    content: Create work-order-form.tsx for starting new work orders
    status: completed
  - id: work-order-editor
    content: Create work-order-editor.tsx for editing and completing work orders
    status: completed
  - id: dashboard-integration
    content: Integrate work order forms into dashboard and authorized vessels
    status: completed
isProject: false
---

# Work Order Parts System

## Architecture Overview

```mermaid
flowchart TB
    subgraph frontend [Frontend Components]
        WOCreate[WorkOrderForm]
        PartsEntry[PartsEntryForm]
        PartsSearch[PartsAutocomplete]
        PhotoUpload[PhotoUploader]
    end
    
    subgraph backend [Convex Backend]
        PartsDB[(partsDatabase)]
        WOParts[(workOrderParts)]
        WorkOrders[(workOrders)]
    end
    
    subgraph queries [Smart Queries]
        Search[searchParts]
        Recent[getRecentParts]
        VesselHistory[getVesselPartHistory]
    end
    
    WOCreate --> PartsEntry
    PartsEntry --> PartsSearch
    PartsSearch --> Search
    PartsSearch --> Recent
    PartsSearch --> VesselHistory
    PartsEntry --> WOParts
    WOCreate --> WorkOrders
    Search --> PartsDB
```



## Phase 1: Database Schema

### New `partsDatabase` table ([convex/schema.ts](convex/schema.ts))

```typescript
partsDatabase: defineTable({
  partNumber: v.string(),
  name: v.string(),
  manufacturer: v.string(),
  category: v.union(
    v.literal("engine"),
    v.literal("electrical"),
    v.literal("plumbing"),
    v.literal("fuel"),
    v.literal("cooling"),
    v.literal("steering"),
    v.literal("hvac"),
    v.literal("safety"),
    v.literal("general")
  ),
  description: v.optional(v.string()),
  averagePrice: v.optional(v.number()),
  isSeeded: v.boolean(), // true for pre-populated, false for user-added
  usageCount: v.number(), // track popularity
  createdAt: v.number(),
})
  .index("by_manufacturer", ["manufacturer"])
  .index("by_category", ["category"])
  .index("by_partNumber", ["partNumber"])
  .searchIndex("search_parts", { searchField: "name", filterFields: ["manufacturer", "category"] })
```

## Phase 2: Backend Functions

### New file: [convex/parts.ts](convex/parts.ts)

**Queries:**

- `searchParts` - Full-text search with filters (manufacturer, category)
- `getRecentParts` - Last 20 parts used by this mechanic
- `getVesselPartHistory` - Parts previously used on this specific vessel
- `getManufacturers` - List of unique manufacturers for dropdown
- `getCategories` - List of part categories

**Mutations:**

- `addPartToCatalog` - Add new part to database (auto-created when mechanic enters new part)
- `incrementUsageCount` - Track part popularity

### Update: [convex/workOrders.ts](convex/workOrders.ts)

**Update `addPart` mutation:**

- Auto-add new parts to `partsDatabase` if not exists
- Track usage count
- Support photo storage ID for part photos

## Phase 3: Frontend Components

### 3.1 Work Order Creation Form

**New component:** `apps/web/components/work-order-form.tsx`

- Triggered from "Start Work Order" buttons in dashboard/authorized vessels
- Fields:
  - Description (required) - What's the issue?
  - Diagnosis (optional) - Initial assessment
  - Equipment reference (optional dropdown) - Link to vessel equipment
- Auto-sets: vesselId, mechanicId, status="in_progress", startedAt

### 3.2 Smart Parts Entry Component

**New component:** `apps/web/components/parts-entry.tsx`

```
+--------------------------------------------------+
| Add Parts                                        |
+--------------------------------------------------+
| [Search parts or enter new...]           [+ Add] |
|                                                  |
| Recently Used:                                   |
| [Mercury Oil Filter] [Yamaha Impeller] [...]     |
|                                                  |
| Previously on this vessel:                       |
| [Quicksilver Anode - used 6 months ago]          |
+--------------------------------------------------+
| Parts Added:                                     |
| +----------------------------------------------+ |
| | Mercury Oil Filter (35-877761K01)            | |
| | Qty: 1  |  $24.99  |  [photo] [x remove]     | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

**Features:**

- Autocomplete dropdown with search results
- Quick-select chips for recent parts
- Vessel history section showing past parts
- Manual entry mode for new parts
- Per-part fields: quantity, price, photo upload option

### 3.3 Parts Autocomplete Dropdown

**New component:** `apps/web/components/parts-autocomplete.tsx`

- Debounced search (300ms)
- Shows: part name, manufacturer, part number, category badge
- Keyboard navigation (arrow keys, enter to select)
- "Add as new part" option when no match found

### 3.4 Work Order Detail/Edit View

**New component:** `apps/web/components/work-order-editor.tsx`

- View/edit mode toggle
- Update diagnosis, work performed
- Add/remove parts using PartsEntry
- Upload before/during/after photos
- Labor tracking (hours, rate)
- Complete or cancel work order

## Phase 4: Seed Data

### Initial Parts (~25 common marine parts)

**File:** `convex/seedParts.ts`


| Category   | Parts                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| Engine     | Oil Filter (Mercury, Yamaha, Volvo), Impeller (3 brands), Spark Plugs, Fuel Filter |
| Electrical | Marine Battery, Fuse Kit, Bilge Pump Switch, LED Nav Light                         |
| Cooling    | Thermostat, Water Pump, Coolant Hose                                               |
| Fuel       | Fuel/Water Separator, Fuel Line, Primer Bulb                                       |
| General    | Zinc Anode, Propeller Nut Kit, Marine Grease, Gear Oil                             |


**Seeding approach:** 

- One-time mutation `seedInitialParts` callable from dashboard (admin only)
- Or automatic seeding on first deploy via Convex init

## Phase 5: Integration Points

### Update Dashboard ([apps/web/components/dashboard.tsx](apps/web/components/dashboard.tsx))

- Replace "Start Work Order" alert with actual form
- Add "Active Work Orders" section for mechanics showing editable work orders
- Quick access to edit in-progress work orders

### Update Authorized Vessels ([apps/web/components/authorized-vessels.tsx](apps/web/components/authorized-vessels.tsx))

- "Start Work Order" button opens WorkOrderForm modal
- Show active work order indicator if one exists

## Data Flow

```mermaid
sequenceDiagram
    participant M as Mechanic
    participant UI as PartsEntry
    participant API as Convex
    participant DB as Database
    
    M->>UI: Type "oil filter"
    UI->>API: searchParts("oil filter")
    API->>DB: Full-text search partsDatabase
    DB-->>API: Matching parts
    API->>DB: getRecentParts(mechanicId)
    DB-->>API: Last 20 parts
    API-->>UI: Combined results
    UI-->>M: Show autocomplete dropdown
    
    M->>UI: Select part + set qty/price
    UI->>API: addPart(workOrderId, partData)
    API->>DB: Insert into workOrderParts
    API->>DB: Increment usageCount in partsDatabase
    API-->>UI: Success
```



## Files to Create/Modify

**Create:**

- `convex/parts.ts` - Parts catalog queries/mutations
- `convex/seedParts.ts` - Initial seed data
- `apps/web/components/work-order-form.tsx` - Create work order
- `apps/web/components/work-order-editor.tsx` - Edit work order
- `apps/web/components/parts-entry.tsx` - Smart parts entry
- `apps/web/components/parts-autocomplete.tsx` - Autocomplete dropdown

**Modify:**

- `convex/schema.ts` - Add partsDatabase table
- `convex/workOrders.ts` - Update addPart to auto-catalog
- `apps/web/components/dashboard.tsx` - Wire up work order forms
- `apps/web/components/authorized-vessels.tsx` - Wire up start work order

