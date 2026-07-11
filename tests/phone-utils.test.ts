import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  normalizePhone,
  validatePhone,
  normalizeAndValidate,
  formatPhone,
  getPhoneFormats,
} from "../src/lib/phone-utils";

describe("normalizePhone", () => {
  it("strips +91 prefix", () => {
    assert.equal(normalizePhone("+917015493276"), "7015493276");
  });

  it("strips 91 prefix", () => {
    assert.equal(normalizePhone("917015493276"), "7015493276");
  });

  it("returns clean 10-digit as-is", () => {
    assert.equal(normalizePhone("7015493276"), "7015493276");
  });

  it("strips spaces and dashes with +91", () => {
    assert.equal(normalizePhone("+91 70154 93276"), "7015493276");
    assert.equal(normalizePhone("+91-70154-93276"), "7015493276");
  });

  it("strips spaces and dashes with 91", () => {
    assert.equal(normalizePhone("91 7015493276"), "7015493276");
  });

  it("strips brackets", () => {
    assert.equal(normalizePhone("(91)7015493276"), "7015493276");
  });

  it("strips spaces and dashes in local number", () => {
    assert.equal(normalizePhone("70154 93276"), "7015493276");
    assert.equal(normalizePhone("70154-93276"), "7015493276");
  });

  it("handles dots", () => {
    assert.equal(normalizePhone("70154.93276"), "7015493276");
  });

  it("handles leading 0 prefix", () => {
    assert.equal(normalizePhone("07015493276"), "7015493276");
  });

  it("handles all variations as the same number", () => {
    const variants = [
      "+917015493276",
      "917015493276",
      "7015493276",
      "+91 70154 93276",
      "+91-70154-93276",
      "91 7015493276",
      "(91)7015493276",
      "70154 93276",
      "70154-93276",
    ];
    for (const v of variants) {
      assert.equal(normalizePhone(v), "7015493276", `failed for: ${v}`);
    }
  });

  it("returns empty string for empty input", () => {
    assert.equal(normalizePhone(""), "");
  });

  it("returns non-digit stripped result for junk", () => {
    assert.equal(normalizePhone("abc7015493276xyz"), "7015493276");
  });
});

describe("validatePhone", () => {
  it("accepts valid 10-digit numbers starting with 6-9", () => {
    assert.equal(validatePhone("7015493276"), true);
    assert.equal(validatePhone("9876543210"), true);
    assert.equal(validatePhone("6123456789"), true);
    assert.equal(validatePhone("8123456789"), true);
  });

  it("rejects numbers not starting with 6-9", () => {
    assert.equal(validatePhone("1234567890"), false);
    assert.equal(validatePhone("5015493276"), false);
    assert.equal(validatePhone("0000000000"), false);
  });

  it("rejects numbers with wrong length", () => {
    assert.equal(validatePhone("701549327"), false);
    assert.equal(validatePhone("70154932760"), false);
    assert.equal(validatePhone("99999"), false);
  });

  it("rejects non-numeric strings", () => {
    assert.equal(validatePhone("abc7015493276"), false);
  });
});

describe("normalizeAndValidate", () => {
  it("normalizes and validates valid numbers", () => {
    assert.equal(normalizeAndValidate("+917015493276"), "7015493276");
    assert.equal(normalizeAndValidate("70154 93276"), "7015493276");
  });

  it("returns null for invalid numbers", () => {
    assert.equal(normalizeAndValidate("1234567890"), null);
    assert.equal(normalizeAndValidate("99999"), null);
    assert.equal(normalizeAndValidate(""), null);
  });

  it("strips non-digits and validates the result", () => {
    // "abc7015493276" strips to "7015493276" which is valid
    assert.equal(normalizeAndValidate("abc7015493276"), "7015493276");
    // true invalid after stripping
    assert.equal(normalizeAndValidate("abc1234567890"), null);
  });
});

describe("formatPhone", () => {
  it("formats 10-digit number to +91 display format", () => {
    assert.equal(formatPhone("7015493276"), "+91 70154 93276");
  });

  it("normalizes and formats", () => {
    assert.equal(formatPhone("+917015493276"), "+91 70154 93276");
  });

  it("returns original for invalid input", () => {
    assert.equal(formatPhone("123"), "123");
  });
});

describe("getPhoneFormats", () => {
  it("generates all common format variants", () => {
    const formats = getPhoneFormats("7015493276");
    assert.ok(formats.includes("7015493276"));
    assert.ok(formats.includes("+917015493276"));
    assert.ok(formats.includes("917015493276"));
    assert.ok(formats.includes("+91-70154-93276"));
    assert.ok(formats.includes("+91 70154 93276"));
    assert.ok(formats.includes("91 70154 93276"));
    assert.ok(formats.includes("70154-93276"));
    assert.ok(formats.includes("70154 93276"));
  });

  it("deduplicates variants", () => {
    const formats = getPhoneFormats("7015493276");
    assert.equal(formats.length, new Set(formats).size);
  });
});

// Test cases from the task spec
describe("task spec test cases", () => {
  it("Existing +917015493276 vs Input 7015493276 -> Duplicate", () => {
    const existing = normalizePhone("+917015493276");
    const input = normalizePhone("7015493276");
    assert.equal(existing, input);
    assert.equal(existing, "7015493276");
  });

  it("Existing 7015493276 vs Input +917015493276 -> Duplicate", () => {
    const existing = normalizePhone("7015493276");
    const input = normalizePhone("+917015493276");
    assert.equal(existing, input);
  });

  it("Existing 91 70154 93276 vs Input 70154-93276 -> Duplicate", () => {
    const existing = normalizePhone("91 70154 93276");
    const input = normalizePhone("70154-93276");
    assert.equal(existing, input);
  });

  it("Existing +91-70154-93276 vs Input 7015493276 -> Duplicate", () => {
    const existing = normalizePhone("+91-70154-93276");
    const input = normalizePhone("7015493276");
    assert.equal(existing, input);
  });

  it("Existing 7015493276 vs Input 7015493277 -> No Duplicate", () => {
    const existing = normalizePhone("7015493276");
    const input = normalizePhone("7015493277");
    assert.notEqual(existing, input);
  });
});
