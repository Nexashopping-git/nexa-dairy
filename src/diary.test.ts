import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatInr, isEligibleDiaryAccount, normalizePhone } from "./diary.ts";

describe("diary portal boundaries", () => {
  it("accepts only active customer and distributor accounts", () => {
    assert.equal(isEligibleDiaryAccount({ role: "CUSTOMER", status: "ACTIVE" }), true);
    assert.equal(isEligibleDiaryAccount({ role: "DISTRIBUTOR", status: "ACTIVE" }), true);
    assert.equal(isEligibleDiaryAccount({ role: "ADMIN", status: "ACTIVE" }), false);
    assert.equal(isEligibleDiaryAccount({ role: "CUSTOMER", status: "SUSPENDED" }), false);
  });

  it("normalizes an Indian mobile number without changing its digits", () => {
    assert.equal(normalizePhone("+91 98765-43210"), "+919876543210");
    assert.equal(normalizePhone("9876543210"), "+919876543210");
    assert.equal(normalizePhone("1234"), null);
  });

  it("formats the approved total as INR", () => {
    assert.match(formatInr("2000.00"), /2,000\.00/);
    assert.equal(formatInr("9007199254740993.01"), "₹9,00,71,99,25,47,40,993.01");
  });
});
