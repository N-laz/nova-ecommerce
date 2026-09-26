import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = { title: "Help & support", description: "Shipping, returns, payments and support at NOVA." };

const SECTIONS = [
  { id: "shipping", title: "Shipping", faqs: [
    ["How long does delivery take?", "Standard delivery is free and takes 3–5 business days. Express delivery (₹99) arrives in 1–2 business days in serviceable pincodes."],
    ["Can I track my order?", "Yes. Every order has a live tracking timeline in Account → Orders, and you'll get notifications when it ships and is delivered."],
  ] },
  { id: "returns", title: "Returns & cancellations", faqs: [
    ["Can I cancel my order?", "You can cancel while the order is Pending or Confirmed. Once it's packed, cancellation is no longer possible, but you can request a replacement after delivery."],
    ["What's the replacement policy?", "We offer a 7-day replacement for manufacturing defects or damage in transit. Raise a request from your order page and we'll arrange a free pickup."],
  ] },
  { id: "payments", title: "Payments", faqs: [
    ["Which payment methods are accepted?", "UPI, credit and debit cards, net banking and Cash on Delivery. Every payment is processed by our PCI-compliant gateway — NOVA never stores card details."],
    ["When will I get my refund?", "Refunds for prepaid orders are initiated immediately on cancellation and reach your original payment method in 5–7 business days."],
    ["How do NOVA Rewards work?", "Earn 1 point for every ₹100 spent. Redeem points at checkout at 1 point = ₹1, up to 10% of your order value."],
  ] },
  { id: "contact", title: "Contact us", faqs: [
    ["How do I reach support?", "Email support@nova.dev or call 1800-419-6682 (10 AM – 8 PM, all days). Include your order number for faster help."],
  ] },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Help & support</h1>
      <p className="mt-2 text-muted">Answers to common questions about orders, delivery and payments.</p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="mb-2 text-lg font-semibold">{s.title}</h2>
            <Accordion type="single" collapsible>
              {s.faqs.map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger>{q}</AccordionTrigger>
                  <AccordionContent><p className="text-sm leading-relaxed text-muted">{a}</p></AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
