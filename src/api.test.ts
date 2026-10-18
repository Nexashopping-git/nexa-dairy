import assert from "node:assert/strict";
import { after, test } from "node:test";
import { requestCode, verifyCode } from "./api.ts";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

test("diary OTP calls only the existing-account sign-in routes", async () => {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options?.body)) });
    const data = calls.length === 1 ? { ok: true } : { token: "token", expiresAt: "2099-01-01T00:00:00.000Z", account: { id: "a", name: null, phone: "+919876543210", role: "CUSTOMER", status: "ACTIVE" } };
    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  await requestCode("+919876543210", "CUSTOMER");
  await verifyCode("+919876543210", "CUSTOMER", "123456");
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), ["/api/v1/auth/diary/otp/request", "/api/v1/auth/diary/otp/verify"]);
  assert.deepEqual(calls[0]?.body, { phone: "+919876543210", role: "CUSTOMER" });
});
