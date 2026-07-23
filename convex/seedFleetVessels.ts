import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// One-time utility: wipe all auth + user records for an email so account can be recreated
export const deleteUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return { deleted: false, reason: "user not found" };

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    await ctx.db.delete(user._id);
    return { deleted: true, accountsRemoved: accounts.length, sessionsRemoved: sessions.length };
  },
});

function generateQRCodeData(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `QRC-${timestamp}-${random}`.toUpperCase();
}

// days/months relative to now as timestamps
const NOW = Date.now();
const DAY = 86400000;
const daysAgo = (d: number) => NOW - d * DAY;
const daysFromNow = (d: number) => NOW + d * DAY;

const FLEET_VESSELS = [
  // ── 1. Sea Hawk — in_service, healthy ─────────────────────────────────────
  {
    name: "Sea Hawk",
    make: "Boston Whaler",
    model: "Outrage 330",
    year: 2021,
    vesselType: "powerboat",
    registrationNumber: "FL-1234-AB",
    hullId: "BWC33021A",
    status: "in_service" as const,
    notes: "Primary charter vessel. Last full-service completed 40 engine hours ago.",
    insurance: {
      provider: "BoatUS Insurance",
      policyNumber: "BU-7812-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(210),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin Mercury Verado 300 Outboards",
        manufacturer: "Mercury Marine",
        model: "Verado 300",
        serialNumber: "MRV300-2021-4471A",
        yearInstalled: 2021,
        lastServiceDate: daysAgo(45),
        nextServiceDate: daysFromNow(110),
        lastServiceHours: 210,
        serviceIntervalHours: 100,
        currentHours: 252,
        conditionStatus: "good" as const,
        notes: "100-hour service completed. Oil, impellers, and fuel filters replaced.",
        consumablePartNumbers: [
          { name: "Oil Filter", partNumber: "35-877761K01", manufacturer: "Mercury" },
          { name: "Fuel Filter", partNumber: "35-60494-1", manufacturer: "Mercury" },
          { name: "Water Pump Impeller", partNumber: "47-803748Q02", manufacturer: "Mercury" },
        ],
        engineHours: [
          { hours: 0,   daysAgo: 365 * 3, notes: "New outboards installed" },
          { hours: 52,  daysAgo: 365 * 2 + 60, notes: "Break-in service complete" },
          { hours: 110, daysAgo: 365 + 120, notes: "100-hour service" },
          { hours: 165, daysAgo: 365, notes: "Pre-season inspection" },
          { hours: 210, daysAgo: 45, notes: "200-hour service" },
          { hours: 252, daysAgo: 3, notes: "Charter run log" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Garmin GPSMAP 8616 Chartplotter",
        manufacturer: "Garmin",
        model: "GPSMAP 8616",
        serialNumber: "GRM8616-0022-FL",
        yearInstalled: 2021,
        warrantyExpiry: daysFromNow(180),
        conditionStatus: "good" as const,
        notes: "Latest charts loaded. AIS transponder integrated.",
      },
      {
        category: "safety" as const,
        name: "ACR GlobalFix V4 EPIRB",
        manufacturer: "ACR",
        model: "GlobalFix V4",
        serialNumber: "ACR-2021-FL1234",
        yearInstalled: 2021,
        nextServiceDate: daysFromNow(300),
        conditionStatus: "good" as const,
        notes: "Registered with NOAA. Battery expires 2026.",
      },
    ],
  },

  // ── 2. Blue Marlin — in_service, healthy ──────────────────────────────────
  {
    name: "Blue Marlin",
    make: "Grady-White",
    model: "Canyon 306",
    year: 2020,
    vesselType: "powerboat",
    registrationNumber: "FL-5678-CD",
    hullId: "GWC30620B",
    status: "in_service" as const,
    notes: "Primary offshore fishing vessel. All systems green.",
    insurance: {
      provider: "Markel Insurance",
      policyNumber: "MK-4490-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(160),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin Yamaha F300 Outboards",
        manufacturer: "Yamaha",
        model: "F300XCA",
        serialNumber: "YMH-F300-2020-882B",
        yearInstalled: 2020,
        lastServiceDate: daysAgo(30),
        nextServiceDate: daysFromNow(130),
        lastServiceHours: 380,
        serviceIntervalHours: 100,
        currentHours: 418,
        conditionStatus: "good" as const,
        notes: "100-hour service just completed. Impellers and lower unit oil changed.",
        consumablePartNumbers: [
          { name: "Gear Lube", partNumber: "ACC-GEARL-UD-QT", manufacturer: "Yamaha" },
          { name: "Water Pump Repair Kit", partNumber: "6CE-W0078-00-00", manufacturer: "Yamaha" },
        ],
        engineHours: [
          { hours: 0,   daysAgo: 365 * 4, notes: "New engines" },
          { hours: 98,  daysAgo: 365 * 3, notes: "First 100-hr service" },
          { hours: 195, daysAgo: 365 * 2, notes: "200-hr service" },
          { hours: 290, daysAgo: 365, notes: "300-hr service" },
          { hours: 380, daysAgo: 30, notes: "400-hr service" },
          { hours: 418, daysAgo: 4, notes: "Fishing trip log" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Furuno GP-1871F Chartplotter/Fishfinder Combo",
        manufacturer: "Furuno",
        model: "GP-1871F",
        serialNumber: "FRN-1871-0044",
        yearInstalled: 2020,
        conditionStatus: "good" as const,
        notes: "Dual transducer setup. Excellent bottom definition to 3000ft.",
      },
      {
        category: "deck" as const,
        name: "Hooker Electric Harness",
        manufacturer: "Hooker",
        model: "Electric Harness Pro",
        yearInstalled: 2020,
        conditionStatus: "good" as const,
        notes: "Outriggers and downriggers operational.",
      },
    ],
  },

  // ── 3. Gulf Runner — in_maintenance, SERVICE APPROACHING ──────────────────
  {
    name: "Gulf Runner",
    make: "Mako",
    model: "414 CC",
    year: 2022,
    vesselType: "powerboat",
    registrationNumber: "FL-9012-EF",
    hullId: "MKO41422C",
    status: "in_maintenance" as const,
    notes: "Starboard engine fuel injector replacement in progress. Expected back Friday.",
    insurance: {
      provider: "BoatUS Insurance",
      policyNumber: "BU-9034-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(95),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin Mercury V8 AMS 400R Outboards",
        manufacturer: "Mercury Marine",
        model: "V8 AMS 400R",
        serialNumber: "MRV8-400-2022-0019C",
        yearInstalled: 2022,
        lastServiceDate: daysAgo(120),
        nextServiceDate: daysFromNow(10), // APPROACHING — 10 days out
        lastServiceHours: 145,
        serviceIntervalHours: 100,
        currentHours: 238,
        conditionStatus: "needs_attention" as const,
        notes: "Starboard: fuel injector #3 replaced. Port engine approaching 100-hr service — schedule immediately.",
        consumablePartNumbers: [
          { name: "Fuel Injector", partNumber: "8M0147674", manufacturer: "Mercury" },
          { name: "Oil Filter", partNumber: "35-877761K01", manufacturer: "Mercury" },
        ],
        engineHours: [
          { hours: 0,   daysAgo: 365 * 2, notes: "New engines installed" },
          { hours: 55,  daysAgo: 365, notes: "Break-in check" },
          { hours: 145, daysAgo: 120, notes: "100-hr service" },
          { hours: 198, daysAgo: 60, notes: "Mid-season check" },
          { hours: 238, daysAgo: 5, notes: "Pre-maintenance log — injector issue noted" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Simrad NSS16 Evo3S Chartplotter",
        manufacturer: "Simrad",
        model: "NSS16 Evo3S",
        serialNumber: "SMR-NSS16-0077",
        yearInstalled: 2022,
        conditionStatus: "good" as const,
      },
      {
        category: "fuel" as const,
        name: "Twin 150-Gallon Aluminum Fuel Tanks",
        manufacturer: "Moeller",
        yearInstalled: 2022,
        lastServiceDate: daysAgo(30),
        nextServiceDate: daysFromNow(335),
        conditionStatus: "good" as const,
        notes: "No corrosion. Vent lines clear. Inspected during current maintenance.",
      },
    ],
  },

  // ── 4. Tide Chaser — in_maintenance ───────────────────────────────────────
  {
    name: "Tide Chaser",
    make: "Everglades",
    model: "355 CC",
    year: 2019,
    vesselType: "powerboat",
    registrationNumber: "FL-3456-GH",
    hullId: "EVG35519D",
    status: "in_maintenance" as const,
    notes: "Bottom paint and through-hull inspection underway. Back in service by Friday.",
    insurance: {
      provider: "Progressive Marine",
      policyNumber: "PM-1122-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(240),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Triple Yamaha F350 Outboards",
        manufacturer: "Yamaha",
        model: "F350XCC",
        serialNumber: "YMH-F350-2019-551D",
        yearInstalled: 2019,
        lastServiceDate: daysAgo(14),
        nextServiceDate: daysFromNow(85),
        lastServiceHours: 620,
        serviceIntervalHours: 100,
        currentHours: 658,
        conditionStatus: "good" as const,
        notes: "500-hr service performed 14 days ago. Running clean.",
        engineHours: [
          { hours: 0,   daysAgo: 365 * 5, notes: "New triple install" },
          { hours: 100, daysAgo: 365 * 4, notes: "100-hr service" },
          { hours: 200, daysAgo: 365 * 3 + 60, notes: "200-hr service" },
          { hours: 300, daysAgo: 365 * 3, notes: "300-hr service" },
          { hours: 400, daysAgo: 365 * 2, notes: "400-hr service" },
          { hours: 500, daysAgo: 365, notes: "500-hr service" },
          { hours: 620, daysAgo: 14, notes: "600-hr service — bottom paint scheduled same haul" },
          { hours: 658, daysAgo: 1, notes: "Last log before haul-out" },
        ],
      },
      {
        category: "hull" as const,
        name: "Interlux Fiberglass Hull — Antifouling System",
        manufacturer: "Interlux",
        model: "Micron Extra",
        yearInstalled: 2019,
        lastServiceDate: daysAgo(1),
        nextServiceDate: daysFromNow(364),
        conditionStatus: "good" as const,
        notes: "New bottom paint applied during current haul. Zincs replaced.",
      },
      {
        category: "electronics" as const,
        name: "Raymarine Axiom Pro 16 RVX MFD",
        manufacturer: "Raymarine",
        model: "Axiom Pro 16 RVX",
        yearInstalled: 2019,
        conditionStatus: "good" as const,
      },
    ],
  },

  // ── 5. Dolphin Spirit — in_service, healthy ───────────────────────────────
  {
    name: "Dolphin Spirit",
    make: "Pursuit",
    model: "OS 355",
    year: 2023,
    vesselType: "powerboat",
    registrationNumber: "FL-7890-IJ",
    hullId: "PRS35523E",
    status: "in_service" as const,
    notes: "Newest vessel in fleet. 250-hour service completed last month.",
    insurance: {
      provider: "BoatUS Insurance",
      policyNumber: "BU-6651-2025",
      insuredName: "John Doe",
      expiryDate: daysFromNow(340),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Triple Mercury V8 300hp Outboards",
        manufacturer: "Mercury Marine",
        model: "300CXL Verado",
        serialNumber: "MRV300-2023-0088E",
        yearInstalled: 2023,
        lastServiceDate: daysAgo(35),
        nextServiceDate: daysFromNow(95),
        lastServiceHours: 250,
        serviceIntervalHours: 100,
        currentHours: 283,
        conditionStatus: "good" as const,
        notes: "250-hr service completed. All belts, fluids, and zincs fresh.",
        engineHours: [
          { hours: 0,   daysAgo: 365, notes: "New engines — delivery inspection" },
          { hours: 55,  daysAgo: 300, notes: "Break-in service" },
          { hours: 155, daysAgo: 180, notes: "150-hr service" },
          { hours: 250, daysAgo: 35, notes: "250-hr service" },
          { hours: 283, daysAgo: 2, notes: "Charter trip log" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Garmin GPSMAP 923xsv Chartplotter",
        manufacturer: "Garmin",
        model: "GPSMAP 923xsv",
        yearInstalled: 2023,
        warrantyExpiry: daysFromNow(365),
        conditionStatus: "good" as const,
      },
      {
        category: "hvac" as const,
        name: "Webasto Marine Air Conditioning",
        manufacturer: "Webasto",
        model: "FCF Platinum 16000 BTU",
        yearInstalled: 2023,
        warrantyExpiry: daysFromNow(365 + 180),
        lastServiceDate: daysAgo(35),
        nextServiceDate: daysFromNow(330),
        conditionStatus: "good" as const,
        notes: "Filters cleaned during last service. Cooling capacity nominal.",
      },
    ],
  },

  // ── 6. Wave Dancer — out_of_service, SERVICE OVERDUE ──────────────────────
  {
    name: "Wave Dancer",
    make: "Contender",
    model: "39 ST",
    year: 2018,
    vesselType: "powerboat",
    registrationNumber: "FL-2345-KL",
    hullId: "CTD39ST18F",
    status: "out_of_service" as const,
    notes: "Transmission failure on starboard engine. Parts on order. Est. 2-week downtime.",
    insurance: {
      provider: "Markel Insurance",
      policyNumber: "MK-3377-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(55),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin Yamaha F425 XTO Outboards",
        manufacturer: "Yamaha",
        model: "F425 XTO",
        serialNumber: "YMH-F425-2018-009F",
        yearInstalled: 2018,
        lastServiceDate: daysAgo(180),
        // OVERDUE — next service was 60 days ago
        nextServiceDate: daysAgo(60),
        lastServiceHours: 840,
        serviceIntervalHours: 100,
        currentHours: 982,
        conditionStatus: "needs_attention" as const,
        notes: "OVERDUE: 100-hr service past due. Transmission failure likely linked to deferred maintenance. Parts ordered.",
        consumablePartNumbers: [
          { name: "Transmission Gear Lube", partNumber: "ACC-GEARL-UD-QT", manufacturer: "Yamaha" },
          { name: "Starboard Transmission Assembly", partNumber: "6EY-45551-00-00", manufacturer: "Yamaha" },
        ],
        engineHours: [
          { hours: 0,   daysAgo: 365 * 6, notes: "New engines" },
          { hours: 100, daysAgo: 365 * 5, notes: "100-hr service" },
          { hours: 300, daysAgo: 365 * 4, notes: "300-hr service" },
          { hours: 500, daysAgo: 365 * 3, notes: "500-hr service" },
          { hours: 650, daysAgo: 365 * 2, notes: "650-hr service" },
          { hours: 840, daysAgo: 180, notes: "800-hr service — transmission noise noted, monitoring" },
          { hours: 910, daysAgo: 90, notes: "Routine log — noise persisting" },
          { hours: 982, daysAgo: 12, notes: "Breakdown — starboard transmission seized" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Furuno NavNet TZtouch3 MFD",
        manufacturer: "Furuno",
        model: "TZT16F",
        yearInstalled: 2018,
        conditionStatus: "good" as const,
      },
      {
        category: "steering" as const,
        name: "SeaStar Hydraulic Steering System",
        manufacturer: "SeaStar Solutions",
        model: "HA5430",
        yearInstalled: 2018,
        lastServiceDate: daysAgo(180),
        nextServiceDate: daysFromNow(185),
        conditionStatus: "fair" as const,
        notes: "Slight lag noted in port turn. Inspect fluid level when vessel comes back in.",
      },
    ],
  },

  // ── 7. Reef Runner — in_service, SERVICE APPROACHING ──────────────────────
  {
    name: "Reef Runner",
    make: "Regulator",
    model: "34 SS",
    year: 2020,
    vesselType: "powerboat",
    registrationNumber: "FL-6789-MN",
    hullId: "RGL34SS20G",
    status: "in_service" as const,
    notes: "Charter trips Tue–Sat. Engines approaching 100-hr service — schedule for Monday.",
    insurance: {
      provider: "Progressive Marine",
      policyNumber: "PM-8801-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(185),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin Yamaha F300 Outboards",
        manufacturer: "Yamaha",
        model: "F300XCA",
        serialNumber: "YMH-F300-2020-774G",
        yearInstalled: 2020,
        lastServiceDate: daysAgo(85),
        nextServiceDate: daysFromNow(6), // APPROACHING — within 20 engine hours
        lastServiceHours: 490,
        serviceIntervalHours: 100,
        currentHours: 582,
        conditionStatus: "fair" as const,
        notes: "92 hours since last service. Due within 8 engine hours — schedule immediately.",
        engineHours: [
          { hours: 0,   daysAgo: 365 * 4, notes: "New engines" },
          { hours: 95,  daysAgo: 365 * 3, notes: "100-hr service" },
          { hours: 195, daysAgo: 365 * 2 + 90, notes: "200-hr service" },
          { hours: 295, daysAgo: 365 * 2, notes: "300-hr service" },
          { hours: 390, daysAgo: 365, notes: "400-hr service" },
          { hours: 490, daysAgo: 85, notes: "500-hr service" },
          { hours: 538, daysAgo: 45, notes: "Charter run log" },
          { hours: 566, daysAgo: 20, notes: "Charter run log" },
          { hours: 582, daysAgo: 3, notes: "Post-trip log — 8 hrs to next service" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Garmin GPSMAP 1242xsv Plus",
        manufacturer: "Garmin",
        model: "GPSMAP 1242xsv",
        yearInstalled: 2020,
        conditionStatus: "good" as const,
      },
      {
        category: "safety" as const,
        name: "Winslow Life Raft — 6-Person",
        manufacturer: "Winslow",
        model: "Super-Light 6-Person USCG",
        serialNumber: "WNS-6P-2020-FL",
        yearInstalled: 2020,
        nextServiceDate: daysFromNow(30),
        conditionStatus: "good" as const,
        notes: "3-year repack service due in 30 days. Schedule with certified service center.",
      },
    ],
  },

  // ── 8. Sunset Cruiser — storage ───────────────────────────────────────────
  {
    name: "Sunset Cruiser",
    make: "Cabo",
    model: "40 Express",
    year: 2017,
    vesselType: "powerboat",
    registrationNumber: "FL-0123-OP",
    hullId: "CBO40EX17H",
    status: "storage" as const,
    notes: "Winterized and in dry storage. Return to service scheduled for March.",
    insurance: {
      provider: "BoatUS Insurance",
      policyNumber: "BU-5540-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(270),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin Cummins QSB 6.7 Diesel Inboards",
        manufacturer: "Cummins",
        model: "QSB 6.7 480hp",
        serialNumber: "CMN-QSB67-2017-332H",
        yearInstalled: 2017,
        lastServiceDate: daysAgo(60),
        nextServiceDate: daysFromNow(305),
        lastServiceHours: 1650,
        serviceIntervalHours: 250,
        currentHours: 1688,
        conditionStatus: "good" as const,
        notes: "Pre-storage service completed. Fuel stabilizer added. Coolant flushed.",
        engineHours: [
          { hours: 0,    daysAgo: 365 * 7, notes: "New diesel install" },
          { hours: 250,  daysAgo: 365 * 6, notes: "250-hr service" },
          { hours: 500,  daysAgo: 365 * 5, notes: "500-hr service" },
          { hours: 750,  daysAgo: 365 * 4, notes: "750-hr service" },
          { hours: 1000, daysAgo: 365 * 3, notes: "1000-hr full service" },
          { hours: 1250, daysAgo: 365 * 2, notes: "1250-hr service" },
          { hours: 1500, daysAgo: 365, notes: "1500-hr service" },
          { hours: 1650, daysAgo: 60, notes: "Pre-storage service. Winterized." },
          { hours: 1688, daysAgo: 61, notes: "Last operational log before haul" },
        ],
      },
      {
        category: "plumbing" as const,
        name: "Jabsco Marine Head System",
        manufacturer: "Jabsco",
        model: "Twist N Lock 29090",
        yearInstalled: 2017,
        lastServiceDate: daysAgo(60),
        conditionStatus: "good" as const,
        notes: "Winterized. Antifreeze flushed through system.",
      },
    ],
  },

  // ── 9. Deep Blue — in_service, healthy ────────────────────────────────────
  {
    name: "Deep Blue",
    make: "Viking",
    model: "48 Convertible",
    year: 2016,
    vesselType: "powerboat",
    registrationNumber: "FL-4567-QR",
    hullId: "VKG48CV16I",
    status: "in_service" as const,
    notes: "Sport fishing yacht. Twin diesel inboards. 500-hr service due Q3.",
    insurance: {
      provider: "Markel Insurance",
      policyNumber: "MK-2200-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(130),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin MAN V8-1000 Diesel Inboards",
        manufacturer: "MAN Engines",
        model: "V8-1000 CR",
        serialNumber: "MAN-V8-2016-001I",
        yearInstalled: 2016,
        lastServiceDate: daysAgo(120),
        nextServiceDate: daysFromNow(130),
        lastServiceHours: 2200,
        serviceIntervalHours: 250,
        currentHours: 2318,
        conditionStatus: "good" as const,
        notes: "Twin turbocharged diesels running strong. Fuel injectors cleaned at last service.",
        consumablePartNumbers: [
          { name: "MAN Fuel Filter Kit", partNumber: "51.12503-0022", manufacturer: "MAN" },
          { name: "Oil Filter", partNumber: "51.05504-0069", manufacturer: "MAN" },
        ],
        engineHours: [
          { hours: 0,    daysAgo: 365 * 8, notes: "Factory delivery" },
          { hours: 500,  daysAgo: 365 * 6, notes: "500-hr service" },
          { hours: 1000, daysAgo: 365 * 5, notes: "1000-hr major overhaul" },
          { hours: 1500, daysAgo: 365 * 3, notes: "1500-hr service" },
          { hours: 2000, daysAgo: 365 * 2, notes: "2000-hr service — injectors replaced" },
          { hours: 2200, daysAgo: 120, notes: "2200-hr service" },
          { hours: 2285, daysAgo: 60, notes: "Tournament run log" },
          { hours: 2318, daysAgo: 7, notes: "Offshore charter log" },
        ],
      },
      {
        category: "electronics" as const,
        name: "Simrad NSO evo3 Multifunction Display Network",
        manufacturer: "Simrad",
        model: "NSO evo3 19",
        yearInstalled: 2016,
        conditionStatus: "good" as const,
        notes: "Dual-station setup — helm and flybridge. Radar, AIS, and autopilot integrated.",
      },
      {
        category: "hvac" as const,
        name: "Dometic Marine HVAC — 36,000 BTU",
        manufacturer: "Dometic",
        model: "FCX 3500",
        yearInstalled: 2016,
        lastServiceDate: daysAgo(120),
        nextServiceDate: daysFromNow(245),
        conditionStatus: "good" as const,
        notes: "Filters replaced at last haul. Chilled water loop pressure nominal.",
      },
      {
        category: "electrical" as const,
        name: "Mastervolt 24V/175A Alternator Bank",
        manufacturer: "Mastervolt",
        model: "Alpha Pro III 175A",
        yearInstalled: 2020,
        lastServiceDate: daysAgo(120),
        conditionStatus: "good" as const,
        notes: "Replaced original alternators in 2020. Charging output steady.",
      },
    ],
  },

  // ── 10. Island Breeze — out_of_service ────────────────────────────────────
  {
    name: "Island Breeze",
    make: "Sea Ray",
    model: "Sundancer 350",
    year: 2021,
    vesselType: "powerboat",
    registrationNumber: "FL-8901-ST",
    hullId: "SRY35021J",
    status: "out_of_service" as const,
    notes: "Electrical fire damage to helm station. Insurance claim filed. Awaiting adjuster.",
    insurance: {
      provider: "Progressive Marine",
      policyNumber: "PM-7733-2024",
      insuredName: "John Doe",
      expiryDate: daysFromNow(190),
    },
    equipment: [
      {
        category: "propulsion" as const,
        name: "Twin MerCruiser 6.2L MPI Sterndrive",
        manufacturer: "Mercury Marine",
        model: "MerCruiser 6.2L MPI",
        serialNumber: "MCR62-2021-0055J",
        yearInstalled: 2021,
        lastServiceDate: daysAgo(200),
        nextServiceDate: daysAgo(20), // OVERDUE while vessel is down
        lastServiceHours: 185,
        serviceIntervalHours: 100,
        currentHours: 291,
        conditionStatus: "needs_attention" as const,
        notes: "100-hr service overdue. Hold off until fire damage repaired and vessel back in service.",
        engineHours: [
          { hours: 0,   daysAgo: 365 * 3, notes: "New sterndrive installation" },
          { hours: 85,  daysAgo: 365 * 2, notes: "Break-in service" },
          { hours: 185, daysAgo: 200, notes: "100-hr service" },
          { hours: 245, daysAgo: 90, notes: "Cruise log" },
          { hours: 291, daysAgo: 22, notes: "Last log — helm fire occurred 2 days later" },
        ],
      },
      {
        category: "electrical" as const,
        name: "Garmin GPSMAP 8610 Helm Station (Damaged)",
        manufacturer: "Garmin",
        model: "GPSMAP 8610",
        serialNumber: "GRM8610-0031-FL",
        yearInstalled: 2021,
        conditionStatus: "needs_attention" as const,
        notes: "Total loss — fire damage. Insurance claim includes replacement helm electronics package.",
      },
      {
        category: "safety" as const,
        name: "Fireboy FM-200 Fire Suppression System",
        manufacturer: "Fireboy-Xintex",
        model: "FM-200 Automatic",
        yearInstalled: 2021,
        conditionStatus: "needs_attention" as const,
        notes: "Discharged during fire event. Requires recharge and re-certification before vessel returns to service.",
      },
    ],
  },
];

export const removeDuplicateFleets = mutation({
  args: { ownerEmail: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.ownerEmail))
      .first();
    if (!owner) throw new Error(`No user found with email: ${args.ownerEmail}`);

    const fleets = await ctx.db
      .query("fleets")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .collect();

    if (fleets.length <= 1) return { removed: 0 };

    const [keep, ...duplicates] = fleets.sort((a, b) => a._creationTime - b._creationTime);
    let removedVessels = 0;
    for (const fleet of duplicates) {
      const vessels = await ctx.db
        .query("vessels")
        .withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id))
        .collect();
      for (const vessel of vessels) {
        await ctx.db.delete(vessel._id);
        removedVessels++;
      }
      await ctx.db.delete(fleet._id);
    }
    return { kept: keep._id, removedFleets: duplicates.length, removedVessels };
  },
});

export const seedFleetVessels = mutation({
  args: {
    ownerEmail: v.string(),
    fleetName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.ownerEmail))
      .first();
    if (!owner) throw new Error(`No user found with email: ${args.ownerEmail}`);

    if (owner.role === "fleet_manager" || owner.role === "captain") {
      await ctx.db.patch(owner._id, { onboardingCompleted: true });
    }

    const existingFleet = await ctx.db
      .query("fleets")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .first();
    if (existingFleet) {
      const vessels = await ctx.db
        .query("vessels")
        .withIndex("by_fleet", (q) => q.eq("fleetId", existingFleet._id))
        .collect();
      return {
        ownerId: owner._id,
        fleetId: existingFleet._id,
        vessels: vessels.map((v) => ({ id: v._id, name: v.name, status: v.status ?? "in_service" })),
        skipped: true,
      };
    }

    const fleetId = await ctx.db.insert("fleets", {
      ownerId: owner._id,
      name: args.fleetName ?? "Doe Marine Fleet",
      description: "John Doe's primary charter and fishing fleet — Florida Gulf Coast",
      fleetType: "charter",
      createdAt: NOW,
    });

    const created = [];
    for (const v of FLEET_VESSELS) {
      const vesselId = await ctx.db.insert("vessels", {
        ownerId: owner._id,
        fleetId,
        name: v.name,
        make: v.make,
        model: v.model,
        year: v.year,
        vesselType: v.vesselType,
        registrationNumber: v.registrationNumber,
        hullId: v.hullId,
        status: v.status,
        notes: v.notes,
        qrCodeData: generateQRCodeData(),
        insuranceInfo: v.insurance
          ? {
              provider: v.insurance.provider,
              policyNumber: v.insurance.policyNumber,
              insuredName: v.insurance.insuredName,
              expiryDate: v.insurance.expiryDate,
            }
          : undefined,
      });

      for (const eq of v.equipment) {
        const equipmentId = await ctx.db.insert("vesselEquipment", {
          vesselId,
          category: eq.category,
          name: eq.name,
          manufacturer: eq.manufacturer,
          model: (eq as { model?: string }).model,
          serialNumber: (eq as { serialNumber?: string }).serialNumber,
          yearInstalled: eq.yearInstalled,
          warrantyExpiry: (eq as { warrantyExpiry?: number }).warrantyExpiry,
          lastServiceDate: (eq as { lastServiceDate?: number }).lastServiceDate,
          nextServiceDate: (eq as { nextServiceDate?: number }).nextServiceDate,
          lastServiceHours: (eq as { lastServiceHours?: number }).lastServiceHours,
          serviceIntervalHours: (eq as { serviceIntervalHours?: number }).serviceIntervalHours,
          currentHours: (eq as { currentHours?: number }).currentHours,
          conditionStatus: eq.conditionStatus,
          notes: (eq as { notes?: string }).notes,
          consumablePartNumbers: (eq as { consumablePartNumbers?: Array<{ name: string; partNumber: string; manufacturer?: string; notes?: string }> }).consumablePartNumbers,
        });

        // Seed engine hours log for propulsion equipment
        const hours = (eq as { engineHours?: Array<{ hours: number; daysAgo: number; notes: string }> }).engineHours;
        if (hours) {
          for (const log of hours) {
            await ctx.db.insert("engineHoursLog", {
              vesselId,
              equipmentId,
              recordedBy: owner._id,
              hours: log.hours,
              recordedAt: NOW - log.daysAgo * DAY,
              notes: log.notes,
            });
          }
        }
      }

      created.push({ id: vesselId, name: v.name, status: v.status });
    }

    return { ownerId: owner._id, fleetId, vessels: created };
  },
});

// Wipe all fleet data for a user so seedFleetVessels can re-run fresh
export const clearFleetData = mutation({
  args: { ownerEmail: v.string() },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.ownerEmail))
      .first();
    if (!owner) throw new Error(`No user found with email: ${args.ownerEmail}`);

    const fleets = await ctx.db
      .query("fleets")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .collect();

    let removedVessels = 0, removedEquipment = 0, removedHoursLogs = 0;

    for (const fleet of fleets) {
      const vessels = await ctx.db
        .query("vessels")
        .withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id))
        .collect();

      for (const vessel of vessels) {
        const equipment = await ctx.db
          .query("vesselEquipment")
          .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
          .collect();

        for (const eq of equipment) {
          const logs = await ctx.db
            .query("engineHoursLog")
            .withIndex("by_equipment_recorded", (q) => q.eq("equipmentId", eq._id))
            .collect();
          for (const log of logs) { await ctx.db.delete(log._id); removedHoursLogs++; }
          await ctx.db.delete(eq._id);
          removedEquipment++;
        }

        await ctx.db.delete(vessel._id);
        removedVessels++;
      }

      await ctx.db.delete(fleet._id);
    }

    return { removedFleets: fleets.length, removedVessels, removedEquipment, removedHoursLogs };
  },
});
