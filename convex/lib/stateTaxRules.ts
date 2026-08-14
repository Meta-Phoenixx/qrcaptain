// US state sales tax rules for marine vessel repair services.
// Research basis: 2025 state tax law. Update rates annually.
//
// KEY CONCEPTS:
//   laborTaxable   — repair labor is taxable when separately stated on invoice
//   partsAlwaysTaxable — parts/materials sold to customer are taxable
//   fabricationLaborTaxable — custom/modified parts labor is taxable even if repair labor is exempt
//   specialRule    — a note the invoice UI should surface to the mechanic

export interface StateTaxRule {
  state: string;             // 2-letter code
  name: string;
  stateRate: number;         // Base state rate (decimal, e.g. 0.06)
  laborTaxable: boolean;     // Standard repair labor taxable?
  partsAlwaysTaxable: boolean;
  fabricationLaborTaxable: boolean;
  // If laborTaxable=false but labor is taxable when bundled with parts
  laborTaxableWhenBundled: boolean;
  noSalesTax: boolean;       // True for AK, DE, MT, NH, OR
  grossReceiptsTax: boolean; // True for HI, NM — different legal basis but functionally taxes everything
  specialRule: string | null;
  notableExemptions: string[];
}

export const STATE_TAX_RULES: Record<string, StateTaxRule> = {
  AL: {
    state: "AL", name: "Alabama", stateRate: 0.04,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  AK: {
    state: "AK", name: "Alaska", stateRate: 0,
    laborTaxable: false, partsAlwaysTaxable: false, fabricationLaborTaxable: false,
    laborTaxableWhenBundled: false, noSalesTax: true, grossReceiptsTax: false,
    specialRule: "No state sales tax. Some municipalities levy up to ~7.5% local tax — verify the service location's local rate.",
    notableExemptions: [],
  },
  AZ: {
    state: "AZ", name: "Arizona", stateRate: 0.056,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  AR: {
    state: "AR", name: "Arkansas", stateRate: 0.065,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  CA: {
    state: "CA", name: "California", stateRate: 0.0725,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Labor is exempt ONLY if separately stated on the invoice. Fabrication labor (custom/modified parts) is always taxable. Bundled labor+parts: full charge is taxable.",
    notableExemptions: ["Common carrier vessels used in interstate/foreign commerce"],
  },
  CO: {
    state: "CO", name: "Colorado", stateRate: 0.029,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  CT: {
    state: "CT", name: "Connecticut", stateRate: 0.0635,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Marine-specific exemption: repair and maintenance labor on vessels is statutorily exempt (CGS § 12-413a). Parts remain taxable at 6.35%. Oct 1–May 31 use-tax exemption for vessels in storage or repair.",
    notableExemptions: ["Vessel repair labor (CGS § 12-413a)", "Off-season storage/repair use tax exemption Oct 1 – May 31"],
  },
  DE: {
    state: "DE", name: "Delaware", stateRate: 0,
    laborTaxable: false, partsAlwaysTaxable: false, fabricationLaborTaxable: false,
    laborTaxableWhenBundled: false, noSalesTax: true, grossReceiptsTax: false,
    specialRule: "No sales tax. A gross receipts tax applies to the business but is not passed to customers as a line item.",
    notableExemptions: [],
  },
  FL: {
    state: "FL", name: "Florida", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "CRITICAL: Labor is taxable whenever any parts are used in the same repair (the entire invoice — labor AND parts — becomes taxable). Labor-only repairs are exempt. A single repair event caps at $60,000 in tax. Mechanic's FL DOR dealer registration number must appear on the invoice.",
    notableExemptions: [
      "Out-of-state vessels at registered repair facility: 20-day clock tolled while in shop's care (Rule 12A-1.0071) — requires release form within 72h of completion and owner affidavit",
      "Interstate/foreign commerce vessels: full exemption with signed owner affidavit (Rule 12A-1.0641) — commercial carriers only, not charter or recreational fishing",
      "$60,000 sales tax cap per single repair event",
    ],
  },
  GA: {
    state: "GA", name: "Georgia", stateRate: 0.04,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  HI: {
    state: "HI", name: "Hawaii", stateRate: 0.04,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: true,
    specialRule: "Not a traditional sales tax — the General Excise Tax (GET) at 4% applies to all business gross receipts including all repair services and parts. The mechanic pays it; the cost is typically passed to customers.",
    notableExemptions: [],
  },
  ID: {
    state: "ID", name: "Idaho", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  IL: {
    state: "IL", name: "Illinois", stateRate: 0.0625,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Labor exempt only if SEPARATELY STATED. If labor and parts are bundled on the invoice, the full charge is taxable. Custom-fabricated items may be treated as manufacture (fully taxable).",
    notableExemptions: [],
  },
  IN: {
    state: "IN", name: "Indiana", stateRate: 0.07,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  IA: {
    state: "IA", name: "Iowa", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Iowa taxes labor to 'produce, process, or fabricate' broadly. Virtually all marine repair labor is taxable.",
    notableExemptions: [],
  },
  KS: {
    state: "KS", name: "Kansas", stateRate: 0.065,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  KY: {
    state: "KY", name: "Kentucky", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Services to tangible personal property are explicitly taxable.",
    notableExemptions: [],
  },
  LA: {
    state: "LA", name: "Louisiana", stateRate: 0.05,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Services are not taxable unless specifically enumerated; vessel repair labor is not in the enumerated list.",
    notableExemptions: [],
  },
  ME: {
    state: "ME", name: "Maine", stateRate: 0.055,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null,
    notableExemptions: ["Commercial fishing and watercraft repairs may qualify for additional exemptions — verify with Maine Revenue Services"],
  },
  MD: {
    state: "MD", name: "Maryland", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null,
    notableExemptions: ["Commercial vessels used in interstate commerce — documentation required"],
  },
  MA: {
    state: "MA", name: "Massachusetts", stateRate: 0.0625,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  MI: {
    state: "MI", name: "Michigan", stateRate: 0.06,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  MN: {
    state: "MN", name: "Minnesota", stateRate: 0.06875,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Labor is exempt ONLY if separately stated. Bundled labor+parts: the full charge is taxable. Always itemize labor and parts separately.",
    notableExemptions: [],
  },
  MS: {
    state: "MS", name: "Mississippi", stateRate: 0.07,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  MO: {
    state: "MO", name: "Missouri", stateRate: 0.04225,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  MT: {
    state: "MT", name: "Montana", stateRate: 0,
    laborTaxable: false, partsAlwaysTaxable: false, fabricationLaborTaxable: false,
    laborTaxableWhenBundled: false, noSalesTax: true, grossReceiptsTax: false,
    specialRule: "No sales tax.", notableExemptions: [],
  },
  NE: {
    state: "NE", name: "Nebraska", stateRate: 0.055,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  NV: {
    state: "NV", name: "Nevada", stateRate: 0.0685,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Labor exempt only if SEPARATELY STATED. Bundled charges are fully taxable. Reconditioning services listed separately are not taxable.",
    notableExemptions: [],
  },
  NH: {
    state: "NH", name: "New Hampshire", stateRate: 0,
    laborTaxable: false, partsAlwaysTaxable: false, fabricationLaborTaxable: false,
    laborTaxableWhenBundled: false, noSalesTax: true, grossReceiptsTax: false,
    specialRule: "No sales tax.", notableExemptions: [],
  },
  NJ: {
    state: "NJ", name: "New Jersey", stateRate: 0.06625,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null,
    notableExemptions: ["Commercial fishing vessels: labor AND parts are fully exempt — customer must provide documentation"],
  },
  NM: {
    state: "NM", name: "New Mexico", stateRate: 0.04875,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: true,
    specialRule: "Not a traditional sales tax — the Gross Receipts Tax (GRT) applies to virtually all business receipts including services and parts.",
    notableExemptions: [],
  },
  NY: {
    state: "NY", name: "New York", stateRate: 0.04,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null,
    notableExemptions: ["Commercial fishing vessels used predominantly to harvest fish for sale: full exemption on labor and parts (20 NYCRR § 528.9)"],
  },
  NC: {
    state: "NC", name: "North Carolina", stateRate: 0.0475,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Repair, maintenance, and installation services are explicitly taxable.",
    notableExemptions: [],
  },
  ND: {
    state: "ND", name: "North Dakota", stateRate: 0.05,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  OH: {
    state: "OH", name: "Ohio", stateRate: 0.0575,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  OK: {
    state: "OK", name: "Oklahoma", stateRate: 0.045,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Repair of tangible personal property is explicitly taxable.",
    notableExemptions: [],
  },
  OR: {
    state: "OR", name: "Oregon", stateRate: 0,
    laborTaxable: false, partsAlwaysTaxable: false, fabricationLaborTaxable: false,
    laborTaxableWhenBundled: false, noSalesTax: true, grossReceiptsTax: false,
    specialRule: "No sales tax.", notableExemptions: [],
  },
  PA: {
    state: "PA", name: "Pennsylvania", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  RI: {
    state: "RI", name: "Rhode Island", stateRate: 0.07,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: false, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  SC: {
    state: "SC", name: "South Carolina", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  SD: {
    state: "SD", name: "South Dakota", stateRate: 0.042,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "SD taxes services very broadly; repair services are explicitly included.",
    notableExemptions: [],
  },
  TN: {
    state: "TN", name: "Tennessee", stateRate: 0.07,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  TX: {
    state: "TX", name: "Texas", stateRate: 0.0625,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null,
    notableExemptions: [
      "Vessels 65+ net tons in interstate/foreign commerce: labor and materials exempt — owner must provide signed statement",
      "Commercial fishing vessels operating in Gulf of Mexico may qualify — verify with TX Comptroller",
    ],
  },
  UT: {
    state: "UT", name: "Utah", stateRate: 0.061,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  VT: {
    state: "VT", name: "Vermont", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  VA: {
    state: "VA", name: "Virginia", stateRate: 0.053,
    laborTaxable: false, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Labor exempt if SEPARATELY STATED. Bundled charges: 'true object' test applies — if the object of the transaction is the tangible goods, the full charge may be taxable.",
    notableExemptions: [],
  },
  WA: {
    state: "WA", name: "Washington", stateRate: 0.065,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: "Labor is taxable regardless of whether it is separately stated.",
    notableExemptions: ["Vessels in foreign commerce — documentation closely scrutinized"],
  },
  WV: {
    state: "WV", name: "West Virginia", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  WI: {
    state: "WI", name: "Wisconsin", stateRate: 0.05,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  WY: {
    state: "WY", name: "Wyoming", stateRate: 0.04,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
  DC: {
    state: "DC", name: "Washington D.C.", stateRate: 0.06,
    laborTaxable: true, partsAlwaysTaxable: true, fabricationLaborTaxable: true,
    laborTaxableWhenBundled: true, noSalesTax: false, grossReceiptsTax: false,
    specialRule: null, notableExemptions: [],
  },
};

export function getStateTaxRule(stateCode: string): StateTaxRule | null {
  return STATE_TAX_RULES[stateCode.toUpperCase()] ?? null;
}

export type LineItem = {
  lineType: "part" | "labor_repair" | "labor_fabrication" | "diagnostic" | "sea_trial" | "travel" | "discount" | "other";
  total: number;
  isTaxable: boolean;
};

/**
 * Calculate the taxable amount and tax for an invoice.
 *
 * For Florida: if any parts are present, labor becomes taxable too (entire job).
 * For "separately stated" states: labor is only taxable if the line itself is marked taxable.
 * customerTaxExempt zeroes the entire tax.
 */
export function calculateInvoiceTax(
  lineItems: LineItem[],
  stateCode: string,
  localRateAddOn: number,   // local/county rate on top of state (e.g. 0.01 for 1% county)
  customerTaxExempt: boolean
): {
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotalParts: number;
  subtotalLabor: number;
  subtotalFabrication: number;
  subtotalDiagnostic: number;
  subtotalNonTaxable: number;
  subtotalDiscount: number;
} {
  const rule = getStateTaxRule(stateCode);

  const subtotalParts = lineItems.filter(l => l.lineType === "part" && l.isTaxable).reduce((s, l) => s + l.total, 0);
  const subtotalLabor = lineItems.filter(l => l.lineType === "labor_repair").reduce((s, l) => s + l.total, 0);
  const subtotalFabrication = lineItems.filter(l => l.lineType === "labor_fabrication").reduce((s, l) => s + l.total, 0);
  const subtotalDiagnostic = lineItems.filter(l => ["diagnostic", "sea_trial", "travel"].includes(l.lineType)).reduce((s, l) => s + l.total, 0);
  const subtotalDiscount = lineItems.filter(l => l.lineType === "discount").reduce((s, l) => s + Math.abs(l.total), 0);
  const subtotalNonTaxable = lineItems.filter(l => !l.isTaxable && l.lineType !== "discount").reduce((s, l) => s + l.total, 0);

  if (!rule || rule.noSalesTax || customerTaxExempt) {
    return { taxableAmount: 0, taxRate: 0, taxAmount: 0, subtotalParts, subtotalLabor, subtotalFabrication, subtotalDiagnostic, subtotalNonTaxable, subtotalDiscount };
  }

  const taxRate = rule.stateRate + localRateAddOn;

  // Florida special rule: any parts involved → entire repair (labor + parts) is taxable
  const floridaRule = stateCode.toUpperCase() === "FL" && subtotalParts > 0;

  let taxableAmount = 0;
  if (floridaRule) {
    // Full invoice (parts + labor + diagnostics) minus non-taxable and discounts
    const totalBeforeDiscount = lineItems
      .filter(l => l.lineType !== "discount")
      .reduce((s, l) => s + l.total, 0);
    taxableAmount = Math.max(0, totalBeforeDiscount - subtotalNonTaxable - subtotalDiscount);
  } else {
    // Standard rule: only marked-taxable lines count
    taxableAmount = lineItems
      .filter(l => l.isTaxable && l.lineType !== "discount")
      .reduce((s, l) => s + l.total, 0);
    taxableAmount = Math.max(0, taxableAmount - subtotalDiscount);

    // If state taxes labor when bundled AND both parts and labor are present
    if (rule.laborTaxableWhenBundled && !rule.laborTaxable && subtotalParts > 0 && subtotalLabor > 0) {
      // Add the labor that would otherwise be exempt
      const exemptLaborOnInvoice = lineItems
        .filter(l => l.lineType === "labor_repair" && !l.isTaxable)
        .reduce((s, l) => s + l.total, 0);
      taxableAmount += exemptLaborOnInvoice;
    }
  }

  // Apply FL $60,000 tax cap
  let taxAmount = taxableAmount * taxRate;
  if (stateCode.toUpperCase() === "FL" && taxAmount > 60000) {
    taxAmount = 60000;
  }

  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    subtotalParts,
    subtotalLabor,
    subtotalFabrication,
    subtotalDiagnostic,
    subtotalNonTaxable,
    subtotalDiscount,
  };
}

export const ALL_STATES = Object.values(STATE_TAX_RULES).map(r => ({ code: r.state, name: r.name }));
