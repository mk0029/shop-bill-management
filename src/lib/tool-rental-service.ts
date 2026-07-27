import { sanityClient } from "@/lib/sanity";
import { notifyAdmins } from "@/lib/admin-notifier";
import { emitWaEventClient } from "@/lib/wa-bot-server";

export type DurationType = "hour" | "day";
export type RentalStatus = "active" | "overdue" | "returned" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export type ToolItem = {
  _id: string;
  toolName: string;
  toolCode: string;
  category: string;
  image?: any;
  description?: string;
  rentPricePerHour: number;
  rentPricePerDay: number;
  depositAmount?: number;
  availableQuantity: number;
  totalQuantity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ToolRental = {
  _id: string;
  customerId: string;
  customerRefId?: string;
  customerName: string;
  customerPhone: string;
  toolId: string;
  toolName: string;
  toolCode: string;
  durationType: DurationType;
  durationValue: number;
  rentStartTime: string;
  expectedReturnTime: string;
  actualReturnTime?: string;
  rentAmount: number;
  depositAmount?: number;
  paidAmount: number;
  isPaid: boolean;
  paymentStatus: PaymentStatus;
  rentalStatus: RentalStatus;
  extraChargeAmount: number;
  totalAmount: number;
  currentTotalAmount?: number;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  overdueReminderCount?: number;
  lastReminderSentAt?: string;
  lastOverdueUnitNotified?: number;
};

export function calculateExpectedReturnTime(startIso: string, durationType: DurationType, durationValue: number) {
  const start = new Date(startIso).getTime();
  const ms = durationType === "hour" ? durationValue * 60 * 60 * 1000 : durationValue * 24 * 60 * 60 * 1000;
  return new Date(start + ms).toISOString();
}

export function calculateRentAmount(tool: Pick<ToolItem, "rentPricePerHour" | "rentPricePerDay">, durationType: DurationType, durationValue: number) {
  return durationType === "hour"
    ? Number(tool.rentPricePerHour || 0) * durationValue
    : Number(tool.rentPricePerDay || 0) * durationValue;
}

export function calculateOverdueExtraCharge(rental: Pick<ToolRental, "durationType" | "expectedReturnTime" | "rentAmount"> & { toolRate?: number }, nowIso = new Date().toISOString()) {
  const now = new Date(nowIso).getTime();
  const expected = new Date(rental.expectedReturnTime).getTime();
  if (!Number.isFinite(now) || !Number.isFinite(expected) || now <= expected) {
    return { overdueUnits: 0, extraChargeAmount: 0 };
  }

  const overdueMs = now - expected;
  const unitMs = rental.durationType === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const overdueUnits = Math.ceil(overdueMs / unitMs);
  const defaultUnitRate = rental.durationType === "hour" ? rental.rentAmount : rental.rentAmount;
  const unitRate = Number(rental.toolRate || defaultUnitRate);

  return {
    overdueUnits,
    extraChargeAmount: Math.max(0, overdueUnits * unitRate),
  };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}



function getActorUserIdFromAuthCookie(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = document.cookie
      .split("; ")
      .find((x) => x.startsWith("auth-storage="))
      ?.split("=")[1];
    if (!raw) return "";
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as { state?: { user?: { id?: string; _id?: string } } };
    return String(parsed?.state?.user?.id || parsed?.state?.user?._id || "");
  } catch {
    return "";
  }
}

async function createCashBookCreditEntry(args: {
  customerRefId: string;
  customerName: string;
  amount: number;
  notes: string;
  actorUserId: string;
}) {
  if (!(args.amount > 0)) return;
  await fetch("/api/mutations/cashbook/create-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(args.actorUserId ? { "x-user-id": args.actorUserId } : {}) },
    body: JSON.stringify({
      actorUserId: args.actorUserId,
      entry: {
        user: { _type: "reference", _ref: args.customerRefId },
        userName: args.customerName,
        amount: args.amount,
        type: "credit",
        source: "Tool Rental Payment",
        notes: args.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  });
}

function notifyCustomerToolRent(args: {
  eventId: string;
  eventType: string;
  actorUserId?: string;
  customerUserId?: string;
  title: string;
  body: string;
  rentalId: string;
  toolName?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount?: number;
  paidAmount?: number;
  expectedReturnTime?: string;
  whatsappEventType?: string;
}) {
  const customerUserId = String(args.customerUserId || "").trim();
  if (!customerUserId) return;
  fetch("/api/notifications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: args.eventId,
      eventType: args.eventType,
      actorUserId: args.actorUserId || undefined,
      userIds: [customerUserId],
      title: args.title,
      body: args.body,
      data: {
        rentalId: args.rentalId,
        toolName: args.toolName || "",
        customerId: customerUserId,
        route: "/customer/rented-items",
        route_path: "/customer/rented-items",
      },
    }),
  }).catch((error) => {
    console.warn("[FCM] tool rent customer notification failed", error);
  });

  if (args.customerPhone) {
    void emitWaEventClient(args.whatsappEventType || args.eventType, {
      customerId: customerUserId,
      customerName: args.customerName || "Customer",
      customerPhone: args.customerPhone,
      toolName: args.toolName,
      totalAmount: args.totalAmount,
      paidAmount: args.paidAmount,
      expectedReturnTime: args.expectedReturnTime,
      returnedDate: args.whatsappEventType === "toolRent.returned" ? new Date().toISOString() : undefined,
      eventId: args.eventId,
    }).then((result) => {
      if (!result.ok) console.warn("[WA] tool rental event failed", args.whatsappEventType || args.eventType, result.error);
    });
  }
}

function generateRentalBillNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RENT-${y}${m}${day}-${rand}`;
}

async function createOutstandingRentalBill(args: {
  actorUserId: string;
  customerRefId: string;
  rental: ToolRental;
  finalTotal: number;
  paidAmount: number;
}) {
  if (!String(args.actorUserId || "").trim()) return;
  const due = Math.max(0, args.finalTotal - args.paidAmount);
  if (due <= 0) return;

  const billPayload = {
    _type: "bill",
    billId: `rent-bill-${Date.now()}`,
    billNumber: generateRentalBillNumber(),
    customer: { _type: "reference", _ref: args.customerRefId },
    serviceType: "custom",
    locationType: "shop",
    serviceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [],
    subtotal: args.finalTotal,
    taxAmount: 0,
    discount: 0,
    totalAmount: args.finalTotal,
    paymentStatus: args.paidAmount <= 0 ? "pending" : "partial",
    paidAmount: args.paidAmount,
    balanceAmount: due,
    status: "confirmed",
    priority: "medium",
    notes: `Tool rental outstanding bill for ${args.rental.toolName} (${args.rental.durationValue} ${args.rental.durationType})`,
    internalNotes: `Auto-created from rental ${args.rental._id}. Rent: ${args.rental.rentAmount}, Extra: ${args.rental.extraChargeAmount || 0}, Deposit: ${args.rental.depositAmount || 0}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fetch("/api/mutations/bills/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actorUserId: args.actorUserId,
      bill: billPayload,
    }),
  });
}


export const toolRentalService = {
  async getTools() {
    const query = '*[_type == "tool"] | order(_createdAt desc)';
    return await sanityClient.fetch<ToolItem[]>(query);
  },

  async getToolById(toolId: string) {
    const query = `*[_type == "tool" && _id == "${toolId}"][0]`;
    return await sanityClient.fetch<ToolItem>(query);
  },

  async createTool(payload: Partial<ToolItem>) {
    const now = new Date().toISOString();
    const doc = {
      _type: "tool",
      ...payload,
      availableQuantity: Number(payload.availableQuantity ?? 0),
      totalQuantity: Number(payload.totalQuantity ?? 0),
      rentPricePerHour: Number(payload.rentPricePerHour ?? 0),
      rentPricePerDay: Number(payload.rentPricePerDay ?? 0),
      depositAmount: Number(payload.depositAmount ?? 0),
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    return sanityClient.create(doc as any);
  },

  async updateTool(toolId: string, payload: Partial<ToolItem>) {
    return sanityClient.patch(toolId).set({ ...payload, updatedAt: new Date().toISOString() }).commit();
  },

  async deleteTool(toolId: string) {
    return sanityClient.patch(toolId).set({ isActive: false, updatedAt: new Date().toISOString() }).commit();
  },

  async getToolRentals() {
    const query = `*[_type == "toolRental"] | order(createdAt desc)`;
    return sanityClient.fetch<ToolRental[]>(query);
  },

  async getActiveRentals() {
    const query = `*[_type == "toolRental" && rentalStatus in ["active", "overdue"]] | order(expectedReturnTime asc)`;
    return sanityClient.fetch<ToolRental[]>(query);
  },

  async getOverdueRentals() {
    const query = `*[_type == "toolRental" && rentalStatus == "overdue"] | order(expectedReturnTime asc)`;
    return sanityClient.fetch<ToolRental[]>(query);
  },

  async createToolRental(input: {
    customer: { _id: string; customerId?: string; name: string; phone: string };
    tool: ToolItem;
    durationType: DurationType;
    durationValue: number;
    paidAmount?: number;
    notes?: string;
    createdBy?: string;
    depositAmount?: number;
  }) {
    if (!input.customer?._id) throw new Error("Customer is required");
    if (!input.customer.phone) throw new Error("Customer phone is required for WhatsApp notification");
    if (!input.tool?._id) throw new Error("Tool is required");
    if (!input.tool.isActive) throw new Error("Tool is inactive");
    if ((input.tool.availableQuantity || 0) <= 0) throw new Error("Tool is not available");
    if (!Number.isFinite(input.durationValue) || input.durationValue <= 0) throw new Error("Duration must be greater than 0");

    const start = new Date().toISOString();
    const expectedReturnTime = calculateExpectedReturnTime(start, input.durationType, input.durationValue);
    const rentAmount = calculateRentAmount(input.tool, input.durationType, input.durationValue);
    const paidAmount = Number(input.paidAmount || 0);
    const depositAmount = Number(input.depositAmount ?? input.tool.depositAmount ?? 0);
    const totalAmount = rentAmount + depositAmount;

    if (paidAmount > totalAmount) throw new Error("Paid amount cannot be greater than total amount");

    const paymentStatus: PaymentStatus = paidAmount <= 0 ? "unpaid" : paidAmount >= totalAmount ? "paid" : "partial";

    const now = new Date().toISOString();
    const transaction = sanityClient.transaction();
    const rentalId = `toolRental.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

    transaction.patch(input.tool._id, {
      set: {
        availableQuantity: Math.max(0, Number(input.tool.availableQuantity || 0) - 1),
        updatedAt: now,
      },
    });

    const createPayload = {
      _id: rentalId,
      _type: "toolRental",
      customer: { _type: "reference", _ref: input.customer._id },
      customerId: input.customer.customerId || input.customer._id,
      customerRefId: input.customer._id,
      customerName: input.customer.name,
      customerPhone: input.customer.phone,
      tool: { _type: "reference", _ref: input.tool._id },
      toolId: input.tool._id,
      toolName: input.tool.toolName,
      toolCode: input.tool.toolCode,
      durationType: input.durationType,
      durationValue: input.durationValue,
      rentStartTime: start,
      expectedReturnTime,
      rentAmount,
      depositAmount,
      paidAmount,
      isPaid: paymentStatus === "paid",
      paymentStatus,
      rentalStatus: "active",
      extraChargeAmount: 0,
      totalAmount,
      currentTotalAmount: totalAmount,
      notes: input.notes || "",
      createdBy: input.createdBy || getActorUserIdFromAuthCookie(),
      lastReminderSentAt: null,
      overdueReminderCount: 0,
      lastOverdueUnitNotified: 0,
      createdAt: now,
      updatedAt: now,
    } as any;

    transaction.create(createPayload);
    await transaction.commit();
    const rental = await sanityClient.fetch<ToolRental>(`*[_type == "toolRental" && _id == $rentalId][0]`, { rentalId });

    notifyAdmins({
      title: "New tool rental created",
      body: `${input.customer.name} rented ${input.tool.toolName} (${input.durationValue} ${input.durationType})`,
      data: { route_path: "/admin/rent-tools", rentalId },
      eventType: "toolRent.created",
      eventId: `toolRent.created.${rentalId}.admins`,
    });
    notifyCustomerToolRent({
      eventId: `toolRent.created.${rentalId}.customer.${input.customer._id}`,
      eventType: "toolRent.created",
      actorUserId: input.createdBy || getActorUserIdFromAuthCookie(),
      customerUserId: input.customer._id,
      title: "Tool rental created",
      body: `You rented ${input.tool.toolName}. Return due: ${formatDateTime(expectedReturnTime)}`,
      rentalId,
      toolName: input.tool.toolName,
      customerName: input.customer.name,
      customerPhone: input.customer.phone,
      totalAmount,
      paidAmount,
      expectedReturnTime,
    });

    if (rental) {
      const actorUserId = getActorUserIdFromAuthCookie() || String(rental.createdBy || "");
      Promise.allSettled([
        createCashBookCreditEntry({
          customerRefId: rental.customerRefId || rental.customerId,
          customerName: rental.customerName,
          amount: paidAmount,
          notes: `Tool rent received: ${rental.toolName}`,
          actorUserId,
        }),
      ]).catch(() => {});
      if (paymentStatus !== "paid") {
        notifyAdmins({
          title: "Tool rental payment pending",
          body: `${input.customer.name} has ${paymentStatus} payment for ${input.tool.toolName}`,
          data: { route_path: "/admin/rent-tools", rentalId },
          eventType: "toolRent.updated",
          eventId: `toolRent.updated.${rentalId}.payment-pending`,
        });
      }
    }

    return rental;
  },

  async updateToolRental(rentalId: string, patch: Partial<ToolRental>) {
    return sanityClient.patch(rentalId).set({ ...patch, updatedAt: new Date().toISOString() }).commit();
  },

  async updateRentalDuration(rentalId: string, input: { durationType: DurationType; durationValue: number }) {
    if (!input.durationType || !["hour", "day"].includes(input.durationType)) {
      throw new Error("Invalid duration type");
    }
    if (!Number.isFinite(input.durationValue) || input.durationValue <= 0) {
      throw new Error("Duration must be greater than 0");
    }

    const rental = await sanityClient.fetch<ToolRental>(`*[_type == "toolRental" && _id == $id][0]`, { id: rentalId });
    if (!rental) throw new Error("Rental not found");
    if (rental.rentalStatus === "returned") throw new Error("Returned rental cannot be edited");

    const tool = await sanityClient.fetch<ToolItem>(`*[_type == "tool" && _id == $id][0]`, { id: rental.toolId });
    if (!tool) throw new Error("Tool not found");

    const rentAmount = calculateRentAmount(tool, input.durationType, input.durationValue);
    const expectedReturnTime = calculateExpectedReturnTime(rental.rentStartTime, input.durationType, input.durationValue);
    const depositAmount = Number(rental.depositAmount || 0);
    const totalAmount = rentAmount + depositAmount;
    const paidAmount = Number(rental.paidAmount || 0);
    if (paidAmount > totalAmount) throw new Error("Paid amount exceeds updated total amount");
    const paymentStatus: PaymentStatus = paidAmount <= 0 ? "unpaid" : paidAmount >= totalAmount ? "paid" : "partial";

    const updated = await sanityClient
      .patch(rentalId)
      .set({
        durationType: input.durationType,
        durationValue: input.durationValue,
        expectedReturnTime,
        rentAmount,
        totalAmount,
        currentTotalAmount: totalAmount,
        extraChargeAmount: 0,
        rentalStatus: "active",
        paymentStatus,
        isPaid: paymentStatus === "paid",
        overdueReminderCount: 0,
        lastReminderSentAt: null,
        lastOverdueUnitNotified: 0,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    notifyAdmins({
      title: "Rental duration updated",
      body: `${rental.customerName} rental for ${rental.toolName} updated to ${input.durationValue} ${input.durationType}`,
      data: { route_path: "/admin/rent-tools", rentalId },
      eventType: "toolRent.updated",
      eventId: `toolRent.updated.${rentalId}.duration`,
    });
    notifyCustomerToolRent({
      eventId: `toolRent.updated.${rentalId}.customer.duration`,
      eventType: "toolRent.updated",
      actorUserId: getActorUserIdFromAuthCookie() || String(rental.createdBy || ""),
      customerUserId: rental.customerRefId || rental.customerId,
      title: "Tool rental updated",
      body: `${rental.toolName} rental duration updated. New return due: ${formatDateTime(expectedReturnTime)}`,
      rentalId,
      toolName: rental.toolName,
      customerName: rental.customerName,
      customerPhone: rental.customerPhone,
      totalAmount,
      paidAmount: rental.paidAmount,
      expectedReturnTime,
    });

    return updated;
  },

  async markToolReturned(rental: ToolRental, tool: ToolItem, paidAmount?: number) {
    if (rental.rentalStatus === "returned") throw new Error("Tool already returned");

    const now = new Date().toISOString();
    const rate = rental.durationType === "hour" ? tool.rentPricePerHour : tool.rentPricePerDay;
    const { overdueUnits, extraChargeAmount } = calculateOverdueExtraCharge(
      { durationType: rental.durationType, expectedReturnTime: rental.expectedReturnTime, rentAmount: rental.rentAmount, toolRate: rate },
      now
    );

    const finalTotal = Number(rental.rentAmount || 0) + Number(rental.depositAmount || 0) + extraChargeAmount;
    const previousPaidAmount = Number(rental.paidAmount || 0);
    const resolvedPaidAmount = Math.min(finalTotal, Math.max(0, Number(paidAmount ?? rental.paidAmount ?? 0)));
    const paymentStatus: PaymentStatus = resolvedPaidAmount <= 0 ? "unpaid" : resolvedPaidAmount >= finalTotal ? "paid" : "partial";

    const tx = sanityClient.transaction();
    tx.patch(rental._id, {
      set: {
        rentalStatus: "returned",
        actualReturnTime: now,
        extraChargeAmount,
        currentTotalAmount: finalTotal,
        totalAmount: finalTotal,
        paidAmount: resolvedPaidAmount,
        isPaid: paymentStatus === "paid",
        paymentStatus,
        updatedAt: now,
      },
    });

    tx.patch(tool._id, {
      set: {
        availableQuantity: Math.min(Number(tool.totalQuantity || 0), Number(tool.availableQuantity || 0) + 1),
        updatedAt: now,
      },
    });

    await tx.commit();

    const actorUserId = getActorUserIdFromAuthCookie() || String(rental.createdBy || "");
    const newReceivedAmount = Math.max(0, resolvedPaidAmount - previousPaidAmount);
    await createCashBookCreditEntry({
      customerRefId: rental.customerRefId || rental.customerId,
      customerName: rental.customerName,
      amount: newReceivedAmount,
      notes: `Tool returned: ${rental.toolName}`,
      actorUserId,
    });
    await createOutstandingRentalBill({
      actorUserId,
      customerRefId: rental.customerRefId || rental.customerId,
      rental: {
        ...rental,
        extraChargeAmount,
      },
      finalTotal,
      paidAmount: resolvedPaidAmount,
    });
    notifyAdmins({
      title: "Tool returned",
      body: `${rental.customerName} returned ${rental.toolName}${overdueUnits > 0 ? ` with Rs ${extraChargeAmount.toFixed(2)} extra charges` : ""}`,
      data: { route_path: "/admin/rent-tools", rentalId: rental._id },
      eventType: "toolRent.updated",
      eventId: `toolRent.updated.${rental._id}.returned`,
    });
    notifyCustomerToolRent({
      eventId: `toolRent.updated.${rental._id}.customer.returned`,
      eventType: "toolRent.updated",
      actorUserId,
      customerUserId: rental.customerRefId || rental.customerId,
      title: "Tool returned",
      body: `${rental.toolName} returned. Final total: Rs ${finalTotal.toFixed(2)}.`,
      rentalId: rental._id,
      toolName: rental.toolName,
      customerName: rental.customerName,
      customerPhone: rental.customerPhone,
      totalAmount: finalTotal,
      paidAmount: resolvedPaidAmount,
      whatsappEventType: "toolRent.returned",
    });

    return { overdueUnits, extraChargeAmount, finalTotal, paymentStatus };
  },

  async markRentalPaid(rentalId: string, currentTotalAmount: number, paidAmount: number) {
    const before = await sanityClient.fetch<ToolRental>(`*[_type == "toolRental" && _id == $id][0]`, { id: rentalId });
    const normalizedPaid = Math.max(0, paidAmount);
    if (normalizedPaid > currentTotalAmount) {
      throw new Error("Paid amount cannot be greater than total amount");
    }
    const paymentStatus: PaymentStatus = normalizedPaid <= 0 ? "unpaid" : normalizedPaid >= currentTotalAmount ? "paid" : "partial";
    const updated = await sanityClient
      .patch(rentalId)
      .set({
        paidAmount: normalizedPaid,
        isPaid: paymentStatus === "paid",
        paymentStatus,
        updatedAt: new Date().toISOString(),
      })
      .commit();
    const rental = await sanityClient.fetch<ToolRental>(`*[_type == "toolRental" && _id == $id][0]`, { id: rentalId });
    if (rental) {
      const actorUserId = getActorUserIdFromAuthCookie();
      const deltaReceived = Math.max(0, normalizedPaid - Number(before?.paidAmount || 0));
      await createCashBookCreditEntry({
        customerRefId: rental.customerRefId || rental.customerId,
        customerName: rental.customerName,
        amount: deltaReceived,
        notes: `Tool rent payment: ${rental.toolName}`,
        actorUserId,
      });
      notifyAdmins({
        title: "Tool rental payment updated",
        body: `${rental.customerName} paid Rs ${normalizedPaid} for ${rental.toolName}. Status: ${paymentStatus}`,
        data: { route_path: "/admin/rent-tools", rentalId },
        eventType: "toolRent.updated",
        eventId: `toolRent.updated.${rentalId}.payment.${normalizedPaid}`,
      });
      notifyCustomerToolRent({
        eventId: `toolRent.updated.${rentalId}.customer.payment.${normalizedPaid}`,
        eventType: "toolRent.updated",
        actorUserId,
        customerUserId: rental.customerRefId || rental.customerId,
        title: "Tool rental payment updated",
      body: `${rental.toolName} payment status: ${paymentStatus}. Paid: Rs ${normalizedPaid}.`,
      rentalId,
      toolName: rental.toolName,
      customerName: rental.customerName,
      customerPhone: rental.customerPhone,
      totalAmount: currentTotalAmount,
      paidAmount: normalizedPaid,
      whatsappEventType: paymentStatus === "paid" ? "toolRent.paid" : "toolRent.updated",
      });
    }
    return updated;
  },

  async deleteToolRental(rentalId: string) {
    const rental = await sanityClient.fetch<ToolRental>(`*[_type == "toolRental" && _id == $id][0]`, { id: rentalId });
    if (!rental) throw new Error("Rental not found");

    const tool = await sanityClient.fetch<ToolItem>(`*[_type == "tool" && _id == $id][0]`, { id: rental.toolId });

    const tx = sanityClient.transaction();
    if (tool && rental.rentalStatus !== "returned" && rental.rentalStatus !== "cancelled") {
      tx.patch(tool._id, {
        set: {
          availableQuantity: Math.min(Number(tool.totalQuantity || 0), Number(tool.availableQuantity || 0) + 1),
          updatedAt: new Date().toISOString(),
        },
      });
    }
    tx.delete(rentalId);
    await tx.commit();

    notifyAdmins({
      title: "Rental deleted",
      body: `${rental.customerName} - ${rental.toolName} rental was deleted`,
      data: { route_path: "/admin/rent-tools", rentalId },
      eventType: "toolRent.updated",
      eventId: `toolRent.updated.${rentalId}.deleted`,
    });
    notifyCustomerToolRent({
      eventId: `toolRent.updated.${rentalId}.customer.deleted`,
      eventType: "toolRent.updated",
      actorUserId: getActorUserIdFromAuthCookie() || String(rental.createdBy || ""),
      customerUserId: rental.customerRefId || rental.customerId,
      title: "Tool rental removed",
      body: `${rental.toolName} rental was removed.`,
      rentalId,
      toolName: rental.toolName,
      customerName: rental.customerName,
      customerPhone: rental.customerPhone,
      totalAmount: rental.totalAmount,
      paidAmount: rental.paidAmount,
      whatsappEventType: "toolRent.deleted",
    });

    return { success: true };
  },
};

export function listenTools(onUpdate: () => void) {
  return sanityClient.listen('*[_type == "tool"]', {}, { includeResult: false }).subscribe(() => onUpdate());
}

export function listenToolRentals(onUpdate: () => void) {
  return sanityClient.listen('*[_type == "toolRental"]', {}, { includeResult: false }).subscribe(() => onUpdate());
}

export const getTools = () => toolRentalService.getTools();
export const createTool = (payload: Partial<ToolItem>) => toolRentalService.createTool(payload);
export const updateTool = (toolId: string, payload: Partial<ToolItem>) => toolRentalService.updateTool(toolId, payload);
export const deleteTool = (toolId: string) => toolRentalService.deleteTool(toolId);
export const getToolRentals = () => toolRentalService.getToolRentals();
export const createToolRental = (input: Parameters<typeof toolRentalService.createToolRental>[0]) => toolRentalService.createToolRental(input);
export const updateToolRental = (rentalId: string, patch: Partial<ToolRental>) => toolRentalService.updateToolRental(rentalId, patch);
export const markToolReturned = (rental: ToolRental, tool: ToolItem, paidAmount?: number) => toolRentalService.markToolReturned(rental, tool, paidAmount);
export const markRentalPaid = (rentalId: string, currentTotalAmount: number, paidAmount: number) => toolRentalService.markRentalPaid(rentalId, currentTotalAmount, paidAmount);
export const getActiveRentals = () => toolRentalService.getActiveRentals();
export const getOverdueRentals = () => toolRentalService.getOverdueRentals();
export const updateRentalDuration = (rentalId: string, input: { durationType: DurationType; durationValue: number }) =>
  toolRentalService.updateRentalDuration(rentalId, input);
export const deleteToolRental = (rentalId: string) => toolRentalService.deleteToolRental(rentalId);
