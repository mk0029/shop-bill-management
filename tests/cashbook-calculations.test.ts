import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  roundCurrency,
  calculateReceivedAmount,
  calculateStatus,
  validateManualRecord,
  buildRecordPayload,
  normalizeManualName,
  resolveEntryDisplayName,
  computePendingTotals,
  type ManualRecordInput,
  type CustomerSelection,
} from "../src/lib/cashbook-calculations";

const validCustomer: CustomerSelection = {
  customerId: "cust-1",
  customerName: "Ravi Kumar",
  isCustomName: false,
};

const customNameCustomer: CustomerSelection = {
  customerId: null,
  customerName: "Rahul",
  isCustomName: true,
};

function makeInput(overrides: Partial<ManualRecordInput> = {}): ManualRecordInput {
  return {
    customer: validCustomer,
    totalAmount: 100,
    pendingAmount: 0,
    purpose: "Fan installation",
    type: "credit",
    ...overrides,
  };
}

describe("roundCurrency", () => {
  it("rounds to two decimal places", () => {
    assert.equal(roundCurrency(10.005), 10.01);
    assert.equal(roundCurrency(10.004), 10.0);
  });

  it("handles integer values", () => {
    assert.equal(roundCurrency(100), 100);
  });

  it("returns 0 for NaN", () => {
    assert.equal(roundCurrency(NaN), 0);
  });

  it("returns 0 for Infinity", () => {
    assert.equal(roundCurrency(Infinity), 0);
  });

  it("returns 0 for -Infinity", () => {
    assert.equal(roundCurrency(-Infinity), 0);
  });

  it("handles zero", () => {
    assert.equal(roundCurrency(0), 0);
  });

  it("handles negative values", () => {
    assert.equal(roundCurrency(-5.555), -5.55);
  });

  it("handles floating point precision edge case", () => {
    assert.equal(roundCurrency(0.1 + 0.2), 0.3);
  });
});

describe("calculateReceivedAmount", () => {
  it("credit: subtracts pending from total", () => {
    assert.equal(calculateReceivedAmount(100, 20, "credit"), 80);
  });

  it("credit: zero pending returns full amount", () => {
    assert.equal(calculateReceivedAmount(100, 0, "credit"), 100);
  });

  it("debit: returns total amount (pending ignored)", () => {
    assert.equal(calculateReceivedAmount(100, 20, "debit"), 100);
  });

  it("credit: pending equals total returns 0", () => {
    assert.equal(calculateReceivedAmount(100, 100, "credit"), 0);
  });

  it("handles decimal values", () => {
    assert.equal(calculateReceivedAmount(99.99, 10.50, "credit"), 89.49);
  });
});

describe("calculateStatus", () => {
  it("returns completed when pending is 0", () => {
    assert.equal(calculateStatus(0), "completed");
  });

  it("returns partial when pending > 0", () => {
    assert.equal(calculateStatus(10), "partial");
    assert.equal(calculateStatus(0.01), "partial");
  });
});

describe("validateManualRecord", () => {
  it("validates a correct credit entry", () => {
    const result = validateManualRecord(makeInput());
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  it("rejects empty customer name", () => {
    const result = validateManualRecord(
      makeInput({ customer: { customerId: null, customerName: "", isCustomName: false } })
    );
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("Customer name"));
  });

  it("rejects zero total amount", () => {
    const result = validateManualRecord(makeInput({ totalAmount: 0 }));
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("zero"));
  });

  it("rejects negative total amount", () => {
    const result = validateManualRecord(makeInput({ totalAmount: -10 }));
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("non-negative"));
  });

  it("rejects NaN total amount", () => {
    const result = validateManualRecord(makeInput({ totalAmount: NaN }));
    assert.equal(result.valid, false);
  });

  it("rejects pending amount greater than total", () => {
    const result = validateManualRecord(
      makeInput({ totalAmount: 100, pendingAmount: 150 })
    );
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("greater than total"));
  });

  it("rejects negative pending amount", () => {
    const result = validateManualRecord(
      makeInput({ totalAmount: 100, pendingAmount: -10 })
    );
    assert.equal(result.valid, false);
  });

  it("accepts pending equal to total", () => {
    const result = validateManualRecord(
      makeInput({ totalAmount: 100, pendingAmount: 100 })
    );
    assert.equal(result.valid, true);
  });

  it("rejects empty purpose", () => {
    const result = validateManualRecord(makeInput({ purpose: "" }));
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("Purpose"));
  });

  it("rejects whitespace-only purpose", () => {
    const result = validateManualRecord(makeInput({ purpose: "   " }));
    assert.equal(result.valid, false);
  });

  it("validates a debit entry", () => {
    const result = validateManualRecord(
      makeInput({ type: "debit", pendingAmount: 0 })
    );
    assert.equal(result.valid, true);
  });

  it("ignores pending for debit entries", () => {
    const result = validateManualRecord(
      makeInput({ type: "debit", pendingAmount: 50 })
    );
    assert.equal(result.valid, true);
  });

  it("validates with custom name customer", () => {
    const result = validateManualRecord(
      makeInput({ customer: customNameCustomer })
    );
    assert.equal(result.valid, true);
  });
});

describe("buildRecordPayload", () => {
  it("builds a credit payload with no pending", () => {
    const input = makeInput({ totalAmount: 100, pendingAmount: 0 });
    const payload = buildRecordPayload(input, "admin-1");

    assert.equal(payload.totalAmount, 100);
    assert.equal(payload.pendingAmount, 0);
    assert.equal(payload.receivedAmount, 100);
    assert.equal(payload.amount, 100);
    assert.equal(payload.type, "credit");
    assert.equal(payload.source, "manual");
    assert.equal(payload.status, "completed");
    assert.equal(payload.customerId, "cust-1");
    assert.equal(payload.isCustomName, false);
  });

  it("builds a credit payload with pending", () => {
    const input = makeInput({ totalAmount: 100, pendingAmount: 20 });
    const payload = buildRecordPayload(input, "admin-1");

    assert.equal(payload.totalAmount, 100);
    assert.equal(payload.pendingAmount, 20);
    assert.equal(payload.receivedAmount, 80);
    assert.equal(payload.amount, 80);
    assert.equal(payload.status, "partial");
  });

  it("builds a debit payload (pending forced to 0)", () => {
    const input = makeInput({ totalAmount: 250, pendingAmount: 50, type: "debit" });
    const payload = buildRecordPayload(input, "admin-1");

    assert.equal(payload.totalAmount, 250);
    assert.equal(payload.pendingAmount, 0);
    assert.equal(payload.receivedAmount, 250);
    assert.equal(payload.amount, 250);
    assert.equal(payload.status, "completed");
  });

  it("rounds monetary values", () => {
    const input = makeInput({ totalAmount: 99.999, pendingAmount: 10.001 });
    const payload = buildRecordPayload(input, "admin-1");

    assert.equal(payload.totalAmount, 100);
    assert.equal(payload.pendingAmount, 10);
    assert.equal(payload.receivedAmount, 90);
  });

  it("trims purpose", () => {
    const input = makeInput({ purpose: "  Fan install  " });
    const payload = buildRecordPayload(input, "admin-1");
    assert.equal(payload.purpose, "Fan install");
  });

  it("trims customer name", () => {
    const input = makeInput({
      customer: { customerId: null, customerName: "  Rahul  ", isCustomName: true },
    });
    const payload = buildRecordPayload(input, "admin-1");
    assert.equal(payload.customerName, "Rahul");
    assert.equal(payload.isCustomName, true);
    assert.equal(payload.customerId, null);
  });
});

describe("normalizeManualName", () => {
  it("trims whitespace", () => {
    assert.equal(normalizeManualName("  Rahul  "), "rahul");
  });

  it("collapses multiple spaces", () => {
    assert.equal(normalizeManualName("Rahul   Kumar"), "rahul kumar");
  });

  it("lowercases", () => {
    assert.equal(normalizeManualName("RAHUL"), "rahul");
  });

  it("handles empty string", () => {
    assert.equal(normalizeManualName(""), "");
  });
});

describe("resolveEntryDisplayName", () => {
  it("returns customer name from map when _id matches", () => {
    const map = new Map([["cust-1", { name: "Rahul", nickname: "R" }]]);
    const result = resolveEntryDisplayName(
      { user: { _id: "cust-1", name: "Rahul" } },
      map
    );
    assert.equal(result, "Rahul (R)");
  });

  it("falls back to user.name when _id not in map", () => {
    const map = new Map();
    const result = resolveEntryDisplayName(
      { user: { _id: "unknown", name: "Fallback" } },
      map
    );
    assert.equal(result, "Fallback");
  });

  it("returns customerName when no user", () => {
    const result = resolveEntryDisplayName({ customerName: "Custom" });
    assert.equal(result, "Custom");
  });

  it("returns Unnamed Record as last resort", () => {
    const result = resolveEntryDisplayName({});
    assert.equal(result, "Unnamed Record");
  });
});

describe("computePendingTotals", () => {
  it("aggregates pending by customerId", () => {
    const entries = [
      { pendingAmount: 100, customerId: "u1", customerName: "Rahul" },
      { pendingAmount: 50, customerId: "u1", customerName: "Rahul" },
    ];
    const totals = computePendingTotals(entries);
    assert.equal(totals.byUser.get("u1"), 150);
    assert.equal(totals.byCustomerName.get("Rahul"), 150);
  });

  it("falls back to user._id when customerId is absent", () => {
    const entries = [
      { pendingAmount: 100, user: { _id: "u1" }, customerName: "Rahul" },
    ];
    const totals = computePendingTotals(entries);
    assert.equal(totals.byUser.get("u1"), 100);
  });

  it("prefers customerId over user._id", () => {
    const entries = [
      { pendingAmount: 100, customerId: "cid-999", user: { _id: "u1" }, customerName: "Rahul" },
    ];
    const totals = computePendingTotals(entries);
    assert.equal(totals.byUser.get("cid-999"), 100);
    assert.equal(totals.byUser.has("u1"), false);
  });

  it("skips entries with zero pending", () => {
    const entries = [
      { pendingAmount: 0, customerId: "u1", customerName: "Rahul" },
      { pendingAmount: 100, customerId: "u2", customerName: "Kumar" },
    ];
    const totals = computePendingTotals(entries);
    assert.equal(totals.byUser.has("u1"), false);
    assert.equal(totals.byUser.get("u2"), 100);
  });

  it("handles empty entries", () => {
    const totals = computePendingTotals([]);
    assert.equal(totals.byUser.size, 0);
    assert.equal(totals.byCustomerName.size, 0);
  });

  it("handles undefined pendingAmount", () => {
    const entries = [
      { customerId: "u1", customerName: "Rahul" },
    ];
    const totals = computePendingTotals(entries);
    assert.equal(totals.byUser.size, 0);
  });
});
