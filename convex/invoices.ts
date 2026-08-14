import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";
import { calculateInvoiceTax } from "./lib/stateTaxRules";
import { Errors } from "./lib/errors";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function generateInvoiceNumber(ctx: any, mechanicId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await ctx.db
    .query("invoices")
    .withIndex("by_mechanic", (q: any) => q.eq("mechanicId", mechanicId))
    .collect();
  const seq = (existing.length + 1).toString().padStart(5, "0");
  return `INV-${year}-${seq}`;
}

// ─── queries ──────────────────────────────────────────────────────────────────

export const getInvoicesByMechanic = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "mechanic");
    const all = await ctx.db
      .query("invoices")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .order("desc")
      .collect();
    const list = args.status ? all.filter((i) => i.status === args.status) : all;
    return Promise.all(
      list.map(async (inv) => {
        const customer = await ctx.db.get(inv.customerId);
        const vessel = await ctx.db.get(inv.vesselId);
        return {
          ...inv,
          customerName: customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || customer.name : "Unknown",
          vesselName: vessel?.name ?? "Unknown vessel",
        };
      })
    );
  },
});

export const getInvoicesByCustomer = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const all = await ctx.db
      .query("invoices")
      .withIndex("by_customer", (q) => q.eq("customerId", userId))
      .order("desc")
      .collect();
    const list = args.status ? all.filter((i) => i.status === args.status) : all;
    return Promise.all(
      list.map(async (inv) => {
        const mechanic = await ctx.db.get(inv.mechanicId);
        const vessel = await ctx.db.get(inv.vesselId);
        return {
          ...inv,
          mechanicName: mechanic ? `${mechanic.firstName ?? ""} ${mechanic.lastName ?? ""}`.trim() || mechanic.name : "Unknown",
          mechanicCompany: mechanic?.companyName ?? null,
          vesselName: vessel?.name ?? "Unknown vessel",
        };
      })
    );
  },
});

export const getInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) return null;
    if (inv.mechanicId !== userId && inv.customerId !== userId && user.role !== "admin") {
      throw Errors.accessDenied();
    }
    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .order("asc")
      .collect();
    const mechanic = await ctx.db.get(inv.mechanicId);
    const customer = await ctx.db.get(inv.customerId);
    const vessel = await ctx.db.get(inv.vesselId);
    return {
      ...inv,
      lineItems,
      mechanicName: mechanic ? `${mechanic.firstName ?? ""} ${mechanic.lastName ?? ""}`.trim() : "Unknown",
      mechanicCompany: mechanic?.companyName ?? null,
      customerName: customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "Unknown",
      customerCompany: customer?.companyName ?? null,
      vesselName: vessel?.name ?? "Unknown vessel",
    };
  },
});

export const getInvoiceForWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const inv = await ctx.db
      .query("invoices")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();
    if (!inv) return null;
    if (inv.mechanicId !== userId && inv.customerId !== userId) return null;
    return inv;
  },
});

// ─── mutations ────────────────────────────────────────────────────────────────

const lineItemArg = v.object({
  lineType: v.union(
    v.literal("part"), v.literal("labor_repair"), v.literal("labor_fabrication"),
    v.literal("diagnostic"), v.literal("sea_trial"), v.literal("travel"),
    v.literal("discount"), v.literal("other")
  ),
  description: v.string(),
  partNumber: v.optional(v.string()),
  quantity: v.number(),
  unitPrice: v.number(),
  isTaxable: v.boolean(),
  sortOrder: v.number(),
});

export const createInvoice = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    taxState: v.string(),
    localRateAddOn: v.number(),  // e.g. 0.01 for 1% county surtax
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    warrantyTerms: v.optional(v.string()),
    dueInDays: v.optional(v.number()),
    lineItems: v.array(lineItemArg),
    // Override tax exemption (normally sourced from customer profile)
    overrideTaxExempt: v.optional(v.boolean()),
    overrideExemptionCertNumber: v.optional(v.string()),
    overrideExemptionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: mechanicId, user: mechanic } = await requireRole(ctx, "mechanic");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== mechanicId) throw Errors.accessDenied();

    // Prevent duplicate invoices for the same work order
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();
    if (existing && existing.status !== "void") {
      throw new Error("An invoice already exists for this work order. Void it before creating a new one.");
    }

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    // Determine customer: the vessel owner or the fleet manager who owns the fleet
    const customerId = workOrder.requestedByOwnerId ?? vessel.ownerId;
    const customer = await ctx.db.get(customerId);
    if (!customer) throw Errors.notFound("Customer");

    // Tax exemption: customer profile values unless overridden on this invoice
    const customerTaxExempt = args.overrideTaxExempt ?? customer.taxExempt ?? false;
    const exemptionCertNumber = args.overrideExemptionCertNumber ?? customer.exemptionCertificateNumber;
    const exemptionType = args.overrideExemptionType ?? (customer.taxExempt ? "nonprofit" : undefined);

    // Calculate tax
    const tax = calculateInvoiceTax(
      args.lineItems.map(l => ({ lineType: l.lineType, total: l.quantity * l.unitPrice, isTaxable: l.isTaxable })),
      args.taxState,
      args.localRateAddOn,
      customerTaxExempt
    );

    const grossBeforeDiscount = args.lineItems
      .filter(l => l.lineType !== "discount")
      .reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const total = Math.max(0, grossBeforeDiscount - tax.subtotalDiscount + tax.taxAmount);

    const invoiceNumber = await generateInvoiceNumber(ctx, mechanicId);
    const now = Date.now();

    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber,
      workOrderId: args.workOrderId,
      vesselId: workOrder.vesselId,
      mechanicId,
      customerId,
      status: "draft",
      issuedAt: undefined,
      dueAt: args.dueInDays ? now + args.dueInDays * 24 * 60 * 60 * 1000 : undefined,
      paidAt: undefined,
      viewedAt: undefined,
      paymentMethod: undefined,
      paymentReference: undefined,
      paymentNotes: undefined,

      subtotalParts: tax.subtotalParts,
      subtotalLabor: tax.subtotalLabor,
      subtotalFabrication: tax.subtotalFabrication,
      subtotalDiagnostic: tax.subtotalDiagnostic,
      subtotalDiscount: tax.subtotalDiscount,
      subtotalNonTaxable: tax.subtotalNonTaxable,

      taxState: args.taxState,
      taxRate: tax.taxRate,
      taxableAmount: tax.taxableAmount,
      taxAmount: tax.taxAmount,

      customerTaxExempt,
      exemptionCertNumber,
      exemptionType,
      exemptionAffidavitOnFile: customerTaxExempt,

      total,
      amountPaid: 0,
      balance: total,

      notes: args.notes,
      paymentTerms: args.paymentTerms ?? "Net 30",
      warrantyTerms: args.warrantyTerms,

      // Mechanic snapshot
      mechanicBusinessName: mechanic.companyName ?? `${mechanic.firstName ?? ""} ${mechanic.lastName ?? ""}`.trim(),
      mechanicBusinessAddress: mechanic.businessAddress
        ? `${mechanic.businessAddress.street}, ${mechanic.businessAddress.city}, ${mechanic.businessAddress.state} ${mechanic.businessAddress.zipCode}`
        : undefined,
      mechanicPhone: mechanic.phone,
      mechanicEmail: mechanic.email,
      mechanicDealerRegNumber: mechanic.businessLicenseNumber,
      mechanicLicenseNumber: mechanic.licenseNumber,

      // Vessel snapshot
      vesselHIN: vessel.hullId,
      vesselDocNumber: vessel.registrationNumber,
      vesselSnapshot: JSON.stringify({
        name: vessel.name,
        make: vessel.make,
        model: vessel.model,
        year: vessel.year,
        type: vessel.vesselType,
      }),

      createdAt: now,
      updatedAt: now,
    });

    // Insert line items
    for (const item of args.lineItems) {
      await ctx.db.insert("invoiceLineItems", {
        invoiceId,
        workOrderId: args.workOrderId,
        lineType: item.lineType,
        description: item.description,
        partNumber: item.partNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        isTaxable: item.isTaxable,
        sortOrder: item.sortOrder,
      });
    }

    return { invoiceId, invoiceNumber };
  },
});

export const updateInvoiceDraft = mutation({
  args: {
    invoiceId: v.id("invoices"),
    taxState: v.optional(v.string()),
    localRateAddOn: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    warrantyTerms: v.optional(v.string()),
    dueInDays: v.optional(v.number()),
    lineItems: v.optional(v.array(lineItemArg)),
    overrideTaxExempt: v.optional(v.boolean()),
    overrideExemptionCertNumber: v.optional(v.string()),
    overrideExemptionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: mechanicId } = await requireRole(ctx, "mechanic");
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw Errors.notFound("Invoice");
    if (inv.mechanicId !== mechanicId) throw Errors.accessDenied();
    if (inv.status !== "draft") throw new Error("Only draft invoices can be edited.");

    const customer = await ctx.db.get(inv.customerId);
    const taxState = args.taxState ?? inv.taxState;
    const localRate = args.localRateAddOn ?? 0;
    const customerTaxExempt = args.overrideTaxExempt ?? customer?.taxExempt ?? false;

    let patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.paymentTerms !== undefined) patch.paymentTerms = args.paymentTerms;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.warrantyTerms !== undefined) patch.warrantyTerms = args.warrantyTerms;
    if (args.dueInDays !== undefined) patch.dueAt = Date.now() + args.dueInDays * 24 * 60 * 60 * 1000;
    if (args.overrideTaxExempt !== undefined) patch.customerTaxExempt = args.overrideTaxExempt;
    if (args.overrideExemptionCertNumber !== undefined) patch.exemptionCertNumber = args.overrideExemptionCertNumber;
    if (args.overrideExemptionType !== undefined) patch.exemptionType = args.overrideExemptionType;

    if (args.lineItems) {
      // Replace all line items
      const oldItems = await ctx.db.query("invoiceLineItems").withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId)).collect();
      for (const old of oldItems) await ctx.db.delete(old._id);
      for (const item of args.lineItems) {
        await ctx.db.insert("invoiceLineItems", {
          invoiceId: args.invoiceId,
          workOrderId: inv.workOrderId,
          lineType: item.lineType,
          description: item.description,
          partNumber: item.partNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          isTaxable: item.isTaxable,
          sortOrder: item.sortOrder,
        });
      }

      const tax = calculateInvoiceTax(
        args.lineItems.map(l => ({ lineType: l.lineType, total: l.quantity * l.unitPrice, isTaxable: l.isTaxable })),
        taxState,
        localRate,
        customerTaxExempt
      );
      const gross = args.lineItems.filter(l => l.lineType !== "discount").reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const total = Math.max(0, gross - tax.subtotalDiscount + tax.taxAmount);

      Object.assign(patch, {
        taxState,
        taxRate: tax.taxRate,
        taxableAmount: tax.taxableAmount,
        taxAmount: tax.taxAmount,
        subtotalParts: tax.subtotalParts,
        subtotalLabor: tax.subtotalLabor,
        subtotalFabrication: tax.subtotalFabrication,
        subtotalDiagnostic: tax.subtotalDiagnostic,
        subtotalDiscount: tax.subtotalDiscount,
        subtotalNonTaxable: tax.subtotalNonTaxable,
        total,
        balance: total - (inv.amountPaid ?? 0),
      });
    }

    await ctx.db.patch(args.invoiceId, patch);
    return { success: true };
  },
});

export const sendInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const { userId: mechanicId } = await requireRole(ctx, "mechanic");
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw Errors.notFound("Invoice");
    if (inv.mechanicId !== mechanicId) throw Errors.accessDenied();
    if (inv.status !== "draft") throw new Error("Invoice has already been sent.");

    const now = Date.now();
    await ctx.db.patch(args.invoiceId, { status: "sent", issuedAt: now, updatedAt: now });

    // Notify the customer
    const mechanic = await ctx.db.get(mechanicId);
    const vessel = await ctx.db.get(inv.vesselId);
    const mechanicName = mechanic ? `${mechanic.firstName ?? ""} ${mechanic.lastName ?? ""}`.trim() || mechanic.companyName : "Your mechanic";
    await ctx.db.insert("notifications", {
      userId: inv.customerId,
      type: "invoice_received",
      title: "Invoice received",
      message: `${mechanicName} sent invoice ${inv.invoiceNumber} for work on ${vessel?.name ?? "your vessel"} — $${inv.total.toFixed(2)} due.`,
      relatedId: args.invoiceId,
      relatedType: "invoice",
      isRead: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const markInvoiceViewed = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw Errors.notFound("Invoice");
    if (inv.customerId !== userId) throw Errors.accessDenied();
    if (inv.status === "sent") {
      await ctx.db.patch(args.invoiceId, { status: "viewed", viewedAt: Date.now(), updatedAt: Date.now() });
    }
    return { success: true };
  },
});

export const recordPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    paymentMethod: v.string(),
    paymentReference: v.optional(v.string()),
    paymentNotes: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: mechanicId } = await requireRole(ctx, "mechanic");
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw Errors.notFound("Invoice");
    if (inv.mechanicId !== mechanicId) throw Errors.accessDenied();
    if (inv.status === "void") throw new Error("Cannot record payment on a voided invoice.");

    const newAmountPaid = (inv.amountPaid ?? 0) + args.amount;
    const newBalance = Math.max(0, inv.total - newAmountPaid);
    const now = Date.now();

    await ctx.db.patch(args.invoiceId, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "paid" : inv.status,
      paidAt: newBalance <= 0 ? (args.paidAt ?? now) : undefined,
      paymentMethod: args.paymentMethod,
      paymentReference: args.paymentReference,
      paymentNotes: args.paymentNotes,
      updatedAt: now,
    });

    if (newBalance <= 0) {
      const mechanic = await ctx.db.get(mechanicId);
      const mechanicName = mechanic
        ? `${mechanic.firstName ?? ""} ${mechanic.lastName ?? ""}`.trim() || mechanic.companyName
        : "Your mechanic";
      await ctx.db.insert("notifications", {
        userId: inv.customerId,
        type: "invoice_paid",
        title: "Payment recorded",
        message: `${mechanicName} confirmed payment of ${inv.invoiceNumber} — thank you!`,
        relatedId: args.invoiceId,
        relatedType: "invoice",
        isRead: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const voidInvoice = mutation({
  args: { invoiceId: v.id("invoices"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId: mechanicId } = await requireRole(ctx, "mechanic");
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw Errors.notFound("Invoice");
    if (inv.mechanicId !== mechanicId) throw Errors.accessDenied();
    if (inv.status === "paid") throw new Error("Cannot void a paid invoice.");

    await ctx.db.patch(args.invoiceId, {
      status: "void",
      notes: args.reason ? `VOID: ${args.reason}${inv.notes ? `\n\n${inv.notes}` : ""}` : inv.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
