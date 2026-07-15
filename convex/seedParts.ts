import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";

// Initial seed data for common marine parts (~25 parts)
const SEED_PARTS = [
  // Engine Parts
  {
    partNumber: "35-877761K01",
    name: "Oil Filter",
    manufacturer: "Mercury",
    category: "engine",
    description: "Mercury MerCruiser oil filter for 4-cylinder and V6 engines",
    averagePrice: 24.99,
  },
  {
    partNumber: "69J-13440-03-00",
    name: "Oil Filter",
    manufacturer: "Yamaha",
    category: "engine",
    description: "Yamaha outboard oil filter for F150-F350 models",
    averagePrice: 18.99,
  },
  {
    partNumber: "3847644",
    name: "Oil Filter",
    manufacturer: "Volvo Penta",
    category: "engine",
    description: "Volvo Penta oil filter for 4.3L and 5.0L engines",
    averagePrice: 32.99,
  },
  {
    partNumber: "47-89984T4",
    name: "Impeller Kit",
    manufacturer: "Mercury",
    category: "engine",
    description: "Water pump impeller kit with gaskets for MerCruiser Alpha One",
    averagePrice: 45.99,
  },
  {
    partNumber: "6G1-44352-00-00",
    name: "Impeller",
    manufacturer: "Yamaha",
    category: "engine",
    description: "Yamaha outboard water pump impeller for 6-8HP models",
    averagePrice: 28.99,
  },
  {
    partNumber: "NGK-BPR6ES",
    name: "Spark Plug",
    manufacturer: "NGK",
    category: "engine",
    description: "Marine spark plug for most 4-stroke outboards",
    averagePrice: 4.99,
  },
  {
    partNumber: "33-879885Q",
    name: "Fuel Filter",
    manufacturer: "Mercury",
    category: "fuel",
    description: "Mercury fuel filter/water separator element",
    averagePrice: 19.99,
  },

  // Electrical Parts
  {
    partNumber: "8006-006",
    name: "Marine Battery",
    manufacturer: "Optima",
    category: "electrical",
    description: "BlueTop marine starting/deep cycle battery 12V",
    averagePrice: 289.99,
  },
  {
    partNumber: "ATO-15A-KIT",
    name: "ATO Fuse Kit",
    manufacturer: "Blue Sea Systems",
    category: "electrical",
    description: "Assorted marine ATO fuse kit with 50 fuses",
    averagePrice: 24.99,
  },
  {
    partNumber: "35A-BPS",
    name: "Bilge Pump Switch",
    manufacturer: "Rule",
    category: "electrical",
    description: "Automatic float switch for bilge pumps",
    averagePrice: 18.99,
  },
  {
    partNumber: "LED-NAV-BK",
    name: "LED Navigation Light Kit",
    manufacturer: "Attwood",
    category: "electrical",
    description: "LED bow and stern navigation light combo kit",
    averagePrice: 79.99,
  },

  // Cooling System Parts
  {
    partNumber: "807252T1",
    name: "Thermostat Kit",
    manufacturer: "Mercury",
    category: "cooling",
    description: "MerCruiser thermostat kit with gaskets 160°F",
    averagePrice: 34.99,
  },
  {
    partNumber: "18-3586",
    name: "Water Pump Housing",
    manufacturer: "Sierra",
    category: "cooling",
    description: "Universal water pump housing for most outboards",
    averagePrice: 42.99,
  },
  {
    partNumber: "32-861150A1",
    name: "Coolant Hose",
    manufacturer: "Mercury",
    category: "cooling",
    description: "Upper radiator/heat exchanger hose for MerCruiser",
    averagePrice: 28.99,
  },

  // Fuel System Parts
  {
    partNumber: "S3213",
    name: "Fuel Water Separator",
    manufacturer: "Racor",
    category: "fuel",
    description: "10 micron fuel filter/water separator element",
    averagePrice: 22.99,
  },
  {
    partNumber: "FL-30",
    name: "Fuel Line 3/8\"",
    manufacturer: "Moeller",
    category: "fuel",
    description: "EPA compliant marine fuel line per foot",
    averagePrice: 4.99,
  },
  {
    partNumber: "PB-1",
    name: "Primer Bulb",
    manufacturer: "Moeller",
    category: "fuel",
    description: "Universal marine fuel primer bulb 3/8\" barb",
    averagePrice: 12.99,
  },

  // General/Hull Parts
  {
    partNumber: "CM-55989A",
    name: "Zinc Anode",
    manufacturer: "Martyr",
    category: "general",
    description: "Trim tab zinc anode for MerCruiser Alpha/Bravo",
    averagePrice: 14.99,
  },
  {
    partNumber: "PN-MERC-SS",
    name: "Propeller Nut Kit",
    manufacturer: "Quicksilver",
    category: "general",
    description: "Stainless steel prop nut kit with washer and cotter pin",
    averagePrice: 18.99,
  },
  {
    partNumber: "92-802859Q1",
    name: "Marine Grease",
    manufacturer: "Quicksilver",
    category: "general",
    description: "2-4-C Marine lubricant with PTFE 8oz cartridge",
    averagePrice: 9.99,
  },
  {
    partNumber: "92-858064K01",
    name: "Gear Lube",
    manufacturer: "Quicksilver",
    category: "general",
    description: "High Performance gear lube quart for lower units",
    averagePrice: 14.99,
  },

  // Safety Parts
  {
    partNumber: "1404",
    name: "Type II PFD",
    manufacturer: "Stearns",
    category: "safety",
    description: "Adult universal life jacket US Coast Guard approved",
    averagePrice: 24.99,
  },
  {
    partNumber: "FE-5",
    name: "Fire Extinguisher",
    manufacturer: "Kidde",
    category: "safety",
    description: "Marine fire extinguisher 5-B:C rated with bracket",
    averagePrice: 29.99,
  },

  // Steering Parts
  {
    partNumber: "92-858075K01",
    name: "Power Steering Fluid",
    manufacturer: "Quicksilver",
    category: "steering",
    description: "Power trim and steering fluid quart",
    averagePrice: 11.99,
  },

  // Plumbing Parts
  {
    partNumber: "TH-MFG-GASKET",
    name: "Head Gasket Kit",
    manufacturer: "Dometic",
    category: "plumbing",
    description: "Marine toilet rebuild gasket kit",
    averagePrice: 34.99,
  },
];

// Seed the parts database with initial data
export const seedInitialParts = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    // Check if user is admin (optional - can be removed for easier testing)

    // Check if already seeded
    const existingSeeded = await ctx.db
      .query("partsDatabase")
      .filter((q) => q.eq(q.field("isSeeded"), true))
      .first();

    if (existingSeeded) {
      return { 
        success: false, 
        message: "Database already seeded",
        count: 0 
      };
    }

    // Insert all seed parts
    let insertedCount = 0;
    for (const part of SEED_PARTS) {
      await ctx.db.insert("partsDatabase", {
        ...part,
        category: part.category as "engine" | "electrical" | "plumbing" | "fuel" | "cooling" | "steering" | "hvac" | "safety" | "general",
        isSeeded: true,
        usageCount: 0,
        createdAt: Date.now(),
      });
      insertedCount++;
    }

    return { 
      success: true, 
      message: `Successfully seeded ${insertedCount} parts`,
      count: insertedCount 
    };
  },
});

// Get count of seeded parts
export const getSeededPartsCount = mutation({
  args: {},
  handler: async (ctx) => {
    const parts = await ctx.db
      .query("partsDatabase")
      .filter((q) => q.eq(q.field("isSeeded"), true))
      .collect();
    
    return parts.length;
  },
});
