import { randomBytes } from "node:crypto";
import type { PaymentProvider, PaymentRequest, PaymentOutcome } from "./types";

/**
 * Development gateway — deterministic, no network. Test rules:
 *  • Card 4111 1111 1111 1111 (any future expiry, any CVV) → success
 *  • Card 4000 0000 0000 0002 → declined
 *  • UPI ending in "@fail" → failure; any other valid VPA → success
 *  • Net banking "Test Bank (Fail)" → failure
 *  • TEST method → outcome chosen in the UI
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  supports() {
    return true;
  }

  async createPayment(req: PaymentRequest): Promise<PaymentOutcome> {
    const d = req.details;
    const id = () => `mock_pay_${randomBytes(8).toString("hex")}`;
    switch (d.method) {
      case "COD":
        return { status: "PENDING", metadata: { collectOnDelivery: true } };
      case "TEST":
        return d.outcome === "success" ? { status: "SUCCEEDED", providerPaymentId: id(), metadata: { test: true } } : { status: "FAILED", reason: "Test payment declined (simulated failure)." };
      case "UPI":
        return d.upiId.toLowerCase().endsWith("@fail") ? { status: "FAILED", reason: "UPI request was declined by your bank." } : { status: "SUCCEEDED", providerPaymentId: id(), metadata: { vpa: d.upiId } };
      case "NET_BANKING":
        return /fail/i.test(d.bank) ? { status: "FAILED", reason: "Your bank declined the transaction." } : { status: "SUCCEEDED", providerPaymentId: id(), metadata: { bank: d.bank } };
      case "CARD": {
        const [mm, yy] = d.expiry.split("/").map(Number);
        const exp = new Date(2000 + yy, mm, 0, 23, 59, 59);
        if (exp < new Date()) return { status: "FAILED", reason: "This card has expired." };
        if (!luhn(d.cardNumber)) return { status: "FAILED", reason: "Card number is invalid." };
        if (d.cardNumber === "4000000000000002") return { status: "FAILED", reason: "Card declined by issuer." };
        return { status: "SUCCEEDED", providerPaymentId: id(), metadata: { last4: d.cardNumber.slice(-4), brand: cardBrand(d.cardNumber) } };
      }
    }
  }
}

function luhn(num: string) {
  let s = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    s += n;
    dbl = !dbl;
  }
  return s % 10 === 0;
}

function cardBrand(n: string) {
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6/.test(n)) return "RuPay";
  return "Card";
}
