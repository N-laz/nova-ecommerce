import "server-only";
import { logger } from "@/lib/logger";

export type OutgoingEmail = { to: string; from: string; replyTo?: string; subject: string; html: string; text: string };
export type SendResult = { messageId?: string };

/**
 * Email transport interface. Swap providers with EMAIL_PROVIDER without touching callers.
 *  - console : development — prints the message (including links) to the server log
 *  - smtp    : any SMTP server (Gmail, SES SMTP, Mailgun, Postmark SMTP, Mailpit…)
 *  - resend  : Resend HTTP API
 */
export interface EmailProvider {
  name: string;
  send(msg: OutgoingEmail): Promise<SendResult>;
}

const consoleProvider: EmailProvider = {
  name: "console",
  async send(msg) {
    logger.info("email.console", { to: msg.to, subject: msg.subject });
    // Plain-text body carries the actionable links in dev.
    console.log(`\n──── email → ${msg.to} ────\nSubject: ${msg.subject}\n\n${msg.text}\n────────────────────────────\n`);
    return { messageId: `console_${Date.now().toString(36)}` };
  },
};

function smtpProvider(): EmailProvider {
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("EMAIL_PROVIDER=smtp requires SMTP_HOST");
  let transporter: import("nodemailer").Transporter | null = null;
  return {
    name: "smtp",
    async send(msg) {
      if (!transporter) {
        const nodemailer = await import("nodemailer");
        const port = Number(process.env.SMTP_PORT ?? 587);
        transporter = nodemailer.createTransport({
          host,
          port,
          secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        });
      }
      const info = await transporter.sendMail(msg);
      return { messageId: info.messageId };
    },
  };
}

function resendProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY");
  return {
    name: "resend",
    async send(msg) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: msg.from, to: [msg.to], reply_to: msg.replyTo, subject: msg.subject, html: msg.html, text: msg.text }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? res.statusText}`);
      return { messageId: body.id };
    },
  };
}

let cached: EmailProvider | null = null;
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const name = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();
  cached = name === "smtp" ? smtpProvider() : name === "resend" ? resendProvider() : consoleProvider;
  return cached;
}

export function emailFrom() {
  return process.env.EMAIL_FROM || "NOVA <no-reply@nova.dev>";
}
