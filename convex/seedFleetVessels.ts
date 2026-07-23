import { mutation } from "./_generated/server";
import { v } from "convex/values";

function generateQRCodeData(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `QRC-${timestamp}-${random}`.toUpperCase();
}

const FLEET_VESSELS = [
  {
    name: "Sea Hawk",
    make: "Boston Whaler",
    model: "Outrage 330",
    year: 2021,
    vesselType: "powerboat",
    registrationNumber: "FL-1234-AB",
    hullId: "BWC33021A",
    status: "in_service" as const,
    notes: "Primary charter vessel. Oil change due in 40 engine hours.",
  },
  {
    name: "Blue Marlin",
    make: "Grady-White",
    model: "Canyon 306",
    year: 2020,
    vesselType: "powerboat",
    registrationNumber: "FL-5678-CD",
    hullId: "GWC30620B",
    status: "in_service" as const,
    notes: "Fishing boat. Recently serviced. All systems green.",
  },
  {
    name: "Gulf Runner",
    make: "Mako",
    model: "414 CC",
    year: 2022,
    vesselType: "powerboat",
    registrationNumber: "FL-9012-EF",
    hullId: "MKO41422C",
    status: "in_maintenance" as const,
    notes: "Starboard engine fuel injector replacement in progress.",
  },
  {
    name: "Tide Chaser",
    make: "Everglades",
    model: "355 CC",
    year: 2019,
    vesselType: "powerboat",
    registrationNumber: "FL-3456-GH",
    hullId: "EVG35519D",
    status: "in_maintenance" as const,
    notes: "Bottom paint and through-hull inspection. Expected back in service Friday.",
  },
  {
    name: "Dolphin Spirit",
    make: "Pursuit",
    model: "OS 355",
    year: 2023,
    vesselType: "powerboat",
    registrationNumber: "FL-7890-IJ",
    hullId: "PRS35523E",
    status: "in_service" as const,
    notes: "Newest vessel in the fleet. 250-hour service completed last month.",
  },
  {
    name: "Wave Dancer",
    make: "Contender",
    model: "39 ST",
    year: 2018,
    vesselType: "powerboat",
    registrationNumber: "FL-2345-KL",
    hullId: "CTD39ST18F",
    status: "out_of_service" as const,
    notes: "Transmission failure. Waiting on parts — estimated 2 weeks downtime.",
  },
  {
    name: "Reef Runner",
    make: "Regulator",
    model: "34 SS",
    year: 2020,
    vesselType: "powerboat",
    registrationNumber: "FL-6789-MN",
    hullId: "RGL34SS20G",
    status: "in_service" as const,
    notes: "Runs charter trips Tue–Sat. Last inspected 3 weeks ago.",
  },
  {
    name: "Sunset Cruiser",
    make: "Cabo",
    model: "40 Express",
    year: 2017,
    vesselType: "powerboat",
    registrationNumber: "FL-0123-OP",
    hullId: "CBO40EX17H",
    status: "storage" as const,
    notes: "Winterized. Scheduled to return to service next season.",
  },
  {
    name: "Deep Blue",
    make: "Viking",
    model: "48 Convertible",
    year: 2016,
    vesselType: "powerboat",
    registrationNumber: "FL-4567-QR",
    hullId: "VKG48CV16I",
    status: "in_service" as const,
    notes: "Sport fishing yacht. 500-hour twin-engine service scheduled for Q3.",
  },
  {
    name: "Island Breeze",
    make: "Sea Ray",
    model: "Sundancer 350",
    year: 2021,
    vesselType: "powerboat",
    registrationNumber: "FL-8901-ST",
    hullId: "SRY35021J",
    status: "out_of_service" as const,
    notes: "Electrical fire damage to helm station. Insurance claim in progress.",
  },
];

export const seedFleetVessels = mutation({
  args: {
    ownerEmail: v.string(),
    fleetName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the owner by email
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.ownerEmail))
      .first();

    if (!owner) {
      throw new Error(`No user found with email: ${args.ownerEmail}`);
    }

    // Create a fleet for these vessels
    const fleetId = await ctx.db.insert("fleets", {
      ownerId: owner._id,
      name: args.fleetName ?? "Doe Marine Fleet",
      description: "John Doe's primary charter and fishing fleet — Florida Gulf Coast",
      fleetType: "charter",
      createdAt: Date.now(),
    });

    // Insert all vessels
    const created = [];
    for (const v of FLEET_VESSELS) {
      const id = await ctx.db.insert("vessels", {
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
      });
      created.push({ id, name: v.name, status: v.status });
    }

    return {
      ownerId: owner._id,
      fleetId,
      vessels: created,
    };
  },
});
