import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, PaymentRequest, PaymentOutcome } from "./types";

/**
 * Razorpay via REST (no SDK needed). Flow:
 *  1. createPayment → creates a Razorpay Order, returns REQUIRES_ACTION with key + order id.
 *  2. The checkout client opens Razorpay Checkout with that payload.
 *  3. The client posts razorpay_payment_id/order_id/signature to verifyPaymentAction,
 *     which calls verifyPayment() (HMAC-SHA256) before marking the order paid.
 * Cash on Delivery never reaches a gateway.
 */
export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay";
  constructor(private keyId: string, private keySecret: string) {}

  supports(method: string) {
    return method === "UPI" || method === "CARD" || method === "NET_BANKING";
  }

  async createPayment(req: PaymentRequest): Promise<PaymentOutcome> {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64") },
      body: JSON.stringify({ amount: req.amountPaise, currency: req.currency, receipt: req.orderNumber, notes: { paymentId: req.paymentId } }),
    });
    if (!res.ok) return { status: "FAILED", reason: "Payment gateway is unavailable. Please try another method." };
    const order = (await res.json()) as { id: string };
    return {
      status: "REQUIRES_ACTION",
      providerOrderId: order.id,
      clientPayload: { gateway: "razorpay", key: this.keyId, orderId: order.id, amount: req.amountPaise, currency: req.currency, name: "NOVA", description: req.orderNumber, prefill: req.customer },
    };
  }

  async verifyPayment({ providerOrderId, providerPaymentId, signature }: { providerOrderId: string; providerPaymentId: string; signature: string }) {
    const expected = createHmac("sha256", this.keySecret).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
