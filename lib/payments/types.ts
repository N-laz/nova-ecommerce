import type { PaymentMethod } from "@prisma/client";
import type { PaymentDetails } from "@/lib/validation/checkout";

export type PaymentRequest = {
  paymentId: string; // our Payment row id
  orderNumber: string;
  amountPaise: number; // integer minor units
  currency: "INR";
  method: PaymentMethod;
  details: PaymentDetails;
  customer: { name: string; email: string; phone: string };
};

export type PaymentOutcome =
  | { status: "SUCCEEDED"; providerPaymentId: string; metadata?: Record<string, unknown> }
  | { status: "PENDING"; metadata?: Record<string, unknown> } // e.g. Cash on Delivery
  | { status: "REQUIRES_ACTION"; providerOrderId: string; clientPayload: Record<string, unknown> } // hosted checkout (Razorpay/Stripe)
  | { status: "FAILED"; reason: string };

/**
 * Every gateway implements this interface. Checkout only talks to this
 * contract, so switching mock → Razorpay/Stripe is an env change.
 */
export interface PaymentProvider {
  readonly name: string;
  supports(method: PaymentMethod): boolean;
  createPayment(req: PaymentRequest): Promise<PaymentOutcome>;
  /** Verify a client-side completion (signature/webhook) for REQUIRES_ACTION flows. */
  verifyPayment?(input: { providerOrderId: string; providerPaymentId: string; signature: string }): Promise<boolean>;
}
