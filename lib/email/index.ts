import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { emailFrom, getEmailProvider } from "./providers";
import type { Rendered } from "./templates";

const RETRY_DELAYS_MS = [0, 1_000, 4_000];

/**
 * Send one transactional email.
 *
 * Every message is written to the EmailLog outbox first (with secret links redacted),
 * then delivered with retries. Failures are recorded, never thrown — an email
 * outage must not break checkout or sign-in.
 */
export async function sendEmail(input: { to: string; userId?: string | null; template: string; rendered: Rendered }) {
  const provider = getEmailProvider();
  const { subject, html, text, redacted } = input.rendered;
  const log = await db.emailLog.create({
    data: { to: input.to, userId: input.userId ?? null, template: input.template, subject, html: redacted?.html ?? html, text: redacted?.text ?? text, provider: provider.name },
    select: { id: true },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt]) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    try {
      const res = await provider.send({ to: input.to, from: emailFrom(), replyTo: process.env.EMAIL_REPLY_TO || undefined, subject, html, text });
      await db.emailLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: res.messageId ?? null, attempts: attempt + 1, error: null } });
      return { id: log.id, ok: true as const };
    } catch (err) {
      lastError = err;
      await db.emailLog.update({ where: { id: log.id }, data: { attempts: attempt + 1, error: String((err as Error)?.message ?? err).slice(0, 500) } }).catch(() => {});
    }
  }
  await db.emailLog.update({ where: { id: log.id }, data: { status: "FAILED" } }).catch(() => {});
  logger.error("email.send", { template: input.template, to: input.to, error: String((lastError as Error)?.message ?? lastError) });
  return { id: log.id, ok: false as const };
}

/** Record an email we intentionally didn't send (e.g. user opted out) so the audit log is complete. */
export async function skipEmail(input: { to: string; userId?: string | null; template: string; rendered: Rendered; reason: string }) {
  await db.emailLog.create({
    data: { to: input.to, userId: input.userId ?? null, template: input.template, subject: input.rendered.subject, html: input.rendered.redacted?.html ?? input.rendered.html, text: input.rendered.redacted?.text ?? input.rendered.text, provider: getEmailProvider().name, status: "SKIPPED", error: input.reason },
  });
}

/**
 * Run email work after the response has been sent, so a slow SMTP server never
 * delays the user. Falls back to a detached promise outside a request (scripts).
 */
export function dispatch(task: () => Promise<unknown>) {
  const run = () => task().catch((err) => logger.error("email.dispatch", err));
  try {
    after(run);
  } catch {
    void run();
  }
}
