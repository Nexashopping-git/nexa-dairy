export function isEligibleDiaryAccount(account: { role: string; status: string }): boolean {
  return account.status === "ACTIVE" && (account.role === "CUSTOMER" || account.role === "DISTRIBUTOR");
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[\s()+-]/g, "");
  const mobile = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(mobile) ? `+91${mobile}` : null;
}

export function formatInr(amount: string): string {
  const [whole, fraction = ""] = amount.split(".");
  const grouped = new Intl.NumberFormat("en-IN").format(BigInt(whole || "0"));
  return `₹${grouped}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}
