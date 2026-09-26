import "server-only";
import { formatINR } from "@/lib/format";

/**
 * Transactional email templates. Output is table-based HTML with inline styles
 * (the only thing Gmail/Outlook render reliably) plus a plain-text alternative.
 *
 * Every template returns { subject, html, text } and, when it contains a secret
 * link, a redacted copy for the email log so tokens never sit in the database.
 */

export type Rendered = { subject: string; html: string; text: string; redacted?: { html: string; text: string } };

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${appUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const C = { bg: "#08090B", card: "#111318", line: "#23262E", text: "#FFFFFF", muted: "#8B8F98", accent: "#7C5CFC", success: "#22C55E", danger: "#EF4444" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function layout(opts: { preheader: string; body: string; footerNote?: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>NOVA</title></head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.text};font-family:${FONT};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="padding:0 4px 24px;">
      <a href="${appUrl()}" style="text-decoration:none;color:${C.text};font-size:18px;font-weight:700;letter-spacing:6px;">
        <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:8px;background:${C.accent};color:#fff;font-size:14px;letter-spacing:0;margin-right:10px;vertical-align:middle;">&#10022;</span><span style="vertical-align:middle;">NOVA</span>
      </a>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;padding:32px 28px;">
      ${opts.body}
    </td></tr>
    <tr><td style="padding:24px 4px 0;color:${C.muted};font-size:12px;line-height:18px;">
      ${opts.footerNote ? `${opts.footerNote}<br><br>` : ""}
      NOVA Technologies · Surat, Gujarat, India<br>
      <a href="${appUrl()}/account/notifications" style="color:${C.muted};">Email preferences</a> · <a href="${appUrl()}/help" style="color:${C.muted};">Help centre</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const h1 = (t: string) => `<h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.3px;color:${C.text};">${t}</h1>`;
const p = (t: string, muted = true) => `<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:${muted ? C.muted : C.text};">${t}</p>`;
const button = (label: string, href: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="border-radius:999px;background:#FFFFFF;"><a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#08090B;text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;
const divider = `<div style="height:1px;background:${C.line};margin:24px 0;"></div>`;
const small = (t: string) => `<p style="margin:0;font-size:12px;line-height:18px;color:${C.muted};">${t}</p>`;
const pill = (t: string, color: string) => `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${color}22;color:${color};font-size:12px;font-weight:600;">${t}</span>`;

function redact(html: string, text: string, secretUrl: string) {
  const token = "[secure link — only in the recipient's inbox]";
  return { html: html.split(esc(secretUrl)).join("#redacted").split(secretUrl).join("#redacted"), text: text.split(secretUrl).join(token) };
}

// ─────────────────────────── Account ───────────────────────────

export function verifyEmailTemplate(name: string, url: string): Rendered {
  const subject = "Welcome to NOVA — confirm your email";
  const html = layout({
    preheader: "Confirm your email to secure your NOVA account.",
    body:
      h1(`Welcome, ${esc(first(name))}.`) +
      p("Thanks for joining NOVA. Please confirm this is your email address — it keeps your account secure and makes sure order updates reach you.") +
      button("Confirm email", esc(url)) +
      p(`Your account already has <strong style="color:${C.text};">100 NOVA points</strong>. Use code <strong style="color:${C.text};">WELCOME500</strong> for ₹500 off your first order above ₹10,000.`) +
      divider +
      small(`This link expires in 24 hours. If the button doesn't work, paste this into your browser:<br><span style="color:${C.text};word-break:break-all;">${esc(url)}</span>`),
    footerNote: "You're receiving this because an account was created with this email. If that wasn't you, you can ignore this message.",
  });
  const text = `Welcome to NOVA, ${first(name)}.\n\nConfirm your email: ${url}\n\nThis link expires in 24 hours.\n\nYou have 100 NOVA points. Use WELCOME500 for ₹500 off your first order above ₹10,000.`;
  return { subject, html, text, redacted: redact(html, text, url) };
}

export function welcomeGoogleTemplate(name: string): Rendered {
  const subject = "Welcome to NOVA";
  const html = layout({
    preheader: "Your NOVA account is ready.",
    body:
      h1(`Welcome, ${esc(first(name))}.`) +
      p("Your NOVA account is ready and linked to Google — just use “Continue with Google” to sign in next time.") +
      p(`We've added <strong style="color:${C.text};">100 NOVA points</strong> to get you started. Use code <strong style="color:${C.text};">WELCOME500</strong> for ₹500 off your first order above ₹10,000.`) +
      button("Start exploring", `${appUrl()}/shop`),
  });
  return { subject, html, text: `Welcome to NOVA, ${first(name)}.\n\nYour account is linked to Google. You have 100 NOVA points — use WELCOME500 for ₹500 off above ₹10,000.\n\n${appUrl()}/shop` };
}

export function passwordResetTemplate(name: string, url: string): Rendered {
  const subject = "Reset your NOVA password";
  const html = layout({
    preheader: "Use this link to choose a new password. It expires in 30 minutes.",
    body:
      h1("Reset your password") +
      p(`Hi ${esc(first(name))}, we received a request to reset the password for your NOVA account.`) +
      button("Choose a new password", esc(url)) +
      p("This link works once and expires in 30 minutes. Resetting your password signs you out on every device.") +
      divider +
      small(`Didn't ask for this? You can safely ignore this email — your password won't change.<br><br>Link: <span style="color:${C.text};word-break:break-all;">${esc(url)}</span>`),
  });
  const text = `Hi ${first(name)},\n\nReset your NOVA password: ${url}\n\nThis link works once and expires in 30 minutes. If you didn't ask for this, ignore this email.`;
  return { subject, html, text, redacted: redact(html, text, url) };
}

export function passwordChangedTemplate(name: string, how: "reset" | "changed" | "set"): Rendered {
  const subject = how === "set" ? "A password was added to your NOVA account" : "Your NOVA password was changed";
  const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date());
  const html = layout({
    preheader: "Security notice for your NOVA account.",
    body:
      h1(how === "set" ? "Password added" : "Password changed") +
      p(`Hi ${esc(first(name))}, the password for your NOVA account was ${how === "set" ? "set" : how === "reset" ? "reset" : "changed"} on ${when} IST.${how === "set" ? "" : " Other devices have been signed out."}`) +
      p(`If this wasn't you, <a href="${appUrl()}/forgot-password" style="color:${C.text};">reset your password</a> right away and contact support.`),
  });
  return { subject, html, text: `Hi ${first(name)}, your NOVA password was ${how} on ${when} IST. If this wasn't you, reset it at ${appUrl()}/forgot-password.` };
}

export function googleLinkedTemplate(name: string, googleEmail: string): Rendered {
  const subject = "Google sign-in added to your NOVA account";
  const html = layout({
    preheader: "Security notice for your NOVA account.",
    body:
      h1("Google sign-in connected") +
      p(`Hi ${esc(first(name))}, the Google account <strong style="color:${C.text};">${esc(googleEmail)}</strong> can now be used to sign in to NOVA.`) +
      p(`Not you? Remove it from <a href="${appUrl()}/account/security" style="color:${C.text};">Account → Security</a> and change your password.`),
  });
  return { subject, html, text: `Google account ${googleEmail} can now sign in to your NOVA account. Not you? Visit ${appUrl()}/account/security` };
}

export function testEmailTemplate(provider: string): Rendered {
  const subject = "NOVA test email";
  const html = layout({ preheader: "Your email setup works.", body: h1("It works.") + p(`This test was sent through the <strong style="color:${C.text};">${esc(provider)}</strong> provider. Transactional emails from NOVA will be delivered the same way.`) });
  return { subject, html, text: `NOVA test email via ${provider}. Your email setup works.` };
}

// ─────────────────────────── Orders ───────────────────────────

export type EmailOrder = {
  orderNumber: string;
  status: string;
  placedAt: Date;
  estimatedDelivery: Date | null;
  deliveryMethod: string;
  shipName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  subtotal: string;
  discountTotal: string;
  pointsDiscount: string;
  shippingFee: string;
  taxTotal: string;
  total: string;
  couponCode: string | null;
  pointsEarned: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  cancelReason: string | null;
  items: { name: string; color: string; quantity: number; unitPrice: string; lineTotal: string; image: string | null }[];
};

const date = (d: Date) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
const METHOD: Record<string, string> = { UPI: "UPI", CARD: "Card", NET_BANKING: "Net banking", COD: "Cash on delivery", TEST: "Test payment" };

function itemsTable(o: EmailOrder) {
  const rows = o.items
    .map(
      (it) => `<tr>
  <td width="64" style="padding:10px 0;vertical-align:top;">${it.image ? `<img src="${esc(abs(it.image))}" width="56" height="56" alt="" style="display:block;border-radius:12px;background:#15171D;object-fit:cover;">` : ""}</td>
  <td style="padding:10px 12px;vertical-align:top;font-size:14px;line-height:20px;color:${C.text};">${esc(it.name)}<br><span style="color:${C.muted};font-size:12px;">${it.color ? `${esc(it.color)} · ` : ""}Qty ${it.quantity} × ${formatINR(it.unitPrice)}</span></td>
  <td align="right" style="padding:10px 0;vertical-align:top;font-size:14px;color:${C.text};white-space:nowrap;">${formatINR(it.lineTotal)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalsTable(o: EmailOrder) {
  const line = (label: string, value: string, color: string = C.muted) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:${C.muted};">${label}</td><td align="right" style="padding:4px 0;font-size:14px;color:${color};">${value}</td></tr>`;
  const n = (v: string) => Number(v) > 0;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${line("Subtotal", formatINR(o.subtotal))}
${n(o.discountTotal) ? line(`Coupon${o.couponCode ? ` (${esc(o.couponCode)})` : ""}`, `−${formatINR(o.discountTotal)}`, C.success) : ""}
${n(o.pointsDiscount) ? line("NOVA points", `−${formatINR(o.pointsDiscount)}`, C.success) : ""}
${line(`Shipping (${o.deliveryMethod === "EXPRESS" ? "Express" : "Standard"})`, n(o.shippingFee) ? formatINR(o.shippingFee) : "Free")}
${line("Includes GST", formatINR(o.taxTotal, true))}
<tr><td style="padding:12px 0 0;font-size:16px;font-weight:600;color:${C.text};border-top:1px solid ${C.line};">Total</td><td align="right" style="padding:12px 0 0;font-size:16px;font-weight:600;color:${C.text};border-top:1px solid ${C.line};">${formatINR(o.total, true)}</td></tr>
</table>`;
}

function addressBlock(o: EmailOrder) {
  return `<p style="margin:0;font-size:13px;line-height:20px;color:${C.muted};"><strong style="color:${C.text};font-weight:600;">${esc(o.shipName)}</strong><br>${esc(o.shipLine1)}${o.shipLine2 ? `, ${esc(o.shipLine2)}` : ""}<br>${esc(o.shipCity)}, ${esc(o.shipState)} ${esc(o.shipPincode)}<br>${esc(o.shipPhone)}</p>`;
}

function orderLink(o: EmailOrder) {
  return `${appUrl()}/account/orders/${o.orderNumber}`;
}

function plainItems(o: EmailOrder) {
  return o.items.map((i) => `- ${i.name}${i.color ? ` (${i.color})` : ""} × ${i.quantity} — ${formatINR(i.lineTotal)}`).join("\n");
}

export function orderConfirmedTemplate(o: EmailOrder): Rendered {
  const cod = o.paymentMethod === "COD";
  const subject = `Order ${o.orderNumber} confirmed`;
  const html = layout({
    preheader: `Thanks for your order. ${o.estimatedDelivery ? `Arriving by ${date(o.estimatedDelivery)}.` : ""}`,
    body:
      pill("Confirmed", C.success) +
      `<div style="height:14px;"></div>` +
      h1("Thanks — your order is confirmed.") +
      p(`Order <strong style="color:${C.text};">${o.orderNumber}</strong> · placed ${date(o.placedAt)}${o.estimatedDelivery ? ` · estimated delivery <strong style="color:${C.text};">${date(o.estimatedDelivery)}</strong>` : ""}.`) +
      button("Track your order", orderLink(o)) +
      itemsTable(o) +
      divider +
      totalsTable(o) +
      divider +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="55%" style="vertical-align:top;padding-right:12px;"><p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};">Shipping to</p>${addressBlock(o)}</td>
        <td style="vertical-align:top;"><p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};">Payment</p><p style="margin:0;font-size:13px;line-height:20px;color:${C.text};">${METHOD[o.paymentMethod ?? ""] ?? "—"}<br><span style="color:${C.muted};">${cod ? `Pay ${formatINR(o.total)} on delivery` : o.paymentStatus === "CAPTURED" ? "Paid" : "Processing"}</span></p></td>
      </tr></table>` +
      (o.pointsEarned > 0 ? divider + small(`You earned <strong style="color:${C.text};">${o.pointsEarned} NOVA points</strong> on this order.`) : ""),
    footerNote: `Need an invoice? <a href="${appUrl()}/invoice/${o.orderNumber}" style="color:${C.muted};">Download it here</a>.`,
  });
  const text = `Thanks — order ${o.orderNumber} is confirmed.\n${o.estimatedDelivery ? `Estimated delivery: ${date(o.estimatedDelivery)}\n` : ""}\n${plainItems(o)}\n\nTotal: ${formatINR(o.total, true)} (${METHOD[o.paymentMethod ?? ""] ?? ""})\n\nShipping to: ${o.shipName}, ${o.shipLine1}, ${o.shipCity} ${o.shipPincode}\n\nTrack: ${orderLink(o)}`;
  return { subject, html, text };
}

const STAGE_COPY = {
  SHIPPED: { pill: "Shipped", subject: (n: string) => `Order ${n} has shipped`, title: "Your order is on its way.", line: "Your package has left our warehouse." },
  OUT_FOR_DELIVERY: { pill: "Out for delivery", subject: (n: string) => `Order ${n} is out for delivery`, title: "Arriving today.", line: "Your package is out for delivery and will reach you today." },
  DELIVERED: { pill: "Delivered", subject: (n: string) => `Order ${n} delivered`, title: "Delivered. Enjoy.", line: "Your order has been delivered. We hope you love it." },
} as const;

export function orderStageTemplate(o: EmailOrder, stage: keyof typeof STAGE_COPY): Rendered {
  const c = STAGE_COPY[stage];
  const cod = o.paymentMethod === "COD" && stage !== "DELIVERED";
  const html = layout({
    preheader: c.line,
    body:
      pill(c.pill, stage === "DELIVERED" ? C.success : C.accent) +
      `<div style="height:14px;"></div>` +
      h1(c.title) +
      p(`${c.line} Order <strong style="color:${C.text};">${o.orderNumber}</strong>${stage !== "DELIVERED" && o.estimatedDelivery ? ` · expected ${date(o.estimatedDelivery)}` : ""}.`) +
      (cod ? p(`Please keep <strong style="color:${C.text};">${formatINR(o.total)}</strong> ready — this is a cash-on-delivery order.`) : "") +
      button(stage === "DELIVERED" ? "Write a review" : "Track your order", stage === "DELIVERED" ? `${orderLink(o)}#review` : orderLink(o)) +
      itemsTable(o) +
      divider +
      `<p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};">Delivering to</p>${addressBlock(o)}`,
  });
  return { subject: c.subject(o.orderNumber), html, text: `${c.title}\n${c.line} Order ${o.orderNumber}.\n\n${plainItems(o)}\n\n${orderLink(o)}` };
}

export function orderCancelledTemplate(o: EmailOrder, refunded: boolean): Rendered {
  const subject = `Order ${o.orderNumber} cancelled`;
  const html = layout({
    preheader: refunded ? "Your refund has been initiated." : "Your order has been cancelled.",
    body:
      pill("Cancelled", C.danger) +
      `<div style="height:14px;"></div>` +
      h1("Your order has been cancelled.") +
      p(`Order <strong style="color:${C.text};">${o.orderNumber}</strong> was cancelled${o.cancelReason ? ` — ${esc(o.cancelReason)}` : ""}.`) +
      p(refunded ? `A refund of <strong style="color:${C.text};">${formatINR(o.total, true)}</strong> has been initiated to your original payment method and should arrive in 5–7 business days.` : "You haven't been charged for this order.") +
      itemsTable(o) +
      divider +
      button("Continue shopping", `${appUrl()}/shop`),
  });
  return { subject, html, text: `Order ${o.orderNumber} was cancelled.${o.cancelReason ? ` Reason: ${o.cancelReason}.` : ""}\n${refunded ? `Refund of ${formatINR(o.total, true)} initiated (5–7 business days).` : "You haven't been charged."}\n\n${plainItems(o)}` };
}

// ─────────────────────────── Product alerts ───────────────────────────

export function backInStockTemplate(name: string, product: { name: string; slug: string; price: string; image: string | null }): Rendered {
  const url = `${appUrl()}/product/${product.slug}`;
  const html = layout({
    preheader: `${product.name} is available again.`,
    body:
      pill("Back in stock", C.success) +
      `<div style="height:14px;"></div>` +
      h1(`${esc(product.name)} is back.`) +
      p(`Hi ${esc(first(name))}, something you wanted is available again at ${formatINR(product.price)}. Stock is limited.`) +
      (product.image ? `<img src="${esc(abs(product.image))}" width="100%" alt="${esc(product.name)}" style="display:block;max-width:504px;border-radius:16px;background:#15171D;margin:0 0 20px;">` : "") +
      button("Shop now", url),
  });
  return { subject: `Back in stock: ${product.name}`, html, text: `${product.name} is back in stock at ${formatINR(product.price)}.\n${url}` };
}

export function priceDropTemplate(name: string, product: { name: string; slug: string; image: string | null }, was: string, now: string): Rendered {
  const url = `${appUrl()}/product/${product.slug}`;
  const html = layout({
    preheader: `${product.name} is now ${formatINR(now)}.`,
    body:
      pill("Price drop", C.accent) +
      `<div style="height:14px;"></div>` +
      h1(`${esc(product.name)} just got cheaper.`) +
      p(`Hi ${esc(first(name))}, an item on your wishlist dropped from <span style="text-decoration:line-through;">${formatINR(was)}</span> to <strong style="color:${C.text};">${formatINR(now)}</strong>.`) +
      (product.image ? `<img src="${esc(abs(product.image))}" width="100%" alt="${esc(product.name)}" style="display:block;max-width:504px;border-radius:16px;background:#15171D;margin:0 0 20px;">` : "") +
      button("View deal", url),
  });
  return { subject: `Price drop: ${product.name}`, html, text: `${product.name} dropped from ${formatINR(was)} to ${formatINR(now)}.\n${url}` };
}

export function promotionalTemplate(name: string, title: string, body: string, link?: string | null): Rendered {
  const html = layout({ preheader: body.slice(0, 120), body: h1(esc(title)) + p(`Hi ${esc(first(name))}, ${esc(body)}`) + (link ? button("Take a look", abs(link)) : "") });
  return { subject: title, html, text: `${title}\n\n${body}${link ? `\n\n${abs(link)}` : ""}` };
}

function first(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}
