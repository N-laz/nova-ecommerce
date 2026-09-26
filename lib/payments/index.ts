import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { MockPaymentProvider } from "./mock";
import { RazorpayProvider } from "./razorpay";
import type { PaymentProvider } from "./types";

export * from "./types";

let cached: PaymentProvider | null = null;
const mock = new MockPaymentProvider();

/** Resolve the gateway from env. COD & TEST always use the internal mock provider. */
export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  if (method === "COD" || method === "TEST") return mock;
  if (!cached) {
    const name = process.env.PAYMENT_PROVIDER ?? "mock";
    if (name === "razorpay" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      cached = new RazorpayProvider(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
    } else {
      cached = mock;
    }
  }
  return cached.supports(method) ? cached : mock;
}

export function getProviderByName(name: string): PaymentProvider | null {
  if (name === "mock") return mock;
  if (name === "razorpay" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return new RazorpayProvider(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
  return null;
}
