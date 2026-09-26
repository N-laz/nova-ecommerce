"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { action, AppError, type ActionResult } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, currentSessionId } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema, changePasswordSchema, profileSchema, forgotPasswordSchema, resetPasswordSchema, setPasswordSchema, emailPreferencesSchema } from "@/lib/validation/auth";
import { consumeAuthToken, issueAuthToken } from "@/lib/auth/tokens";
import { dispatch, sendEmail } from "@/lib/email";
import { appUrl, passwordChangedTemplate, passwordResetTemplate, verifyEmailTemplate } from "@/lib/email/templates";
import { mergeGuestCart } from "@/lib/services/cart";
import { notify } from "@/lib/services/notification";
import { revalidatePath } from "next/cache";

function safeNext(next: unknown, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

// Constant-time-ish dummy hash to avoid user enumeration via timing.
const DUMMY_HASH = "$2b$12$nFvmLgmJyWDXpLY.qjlavufQd1/0AnEIljVf3Y.0UF/wf4Hc9bLvy";

export async function registerAction(_: unknown, formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const res = await action("auth.register", async () => {
    await rateLimit("register", { limit: 5, windowMs: 10 * 60_000 });
    const input = registerSchema.parse(Object.fromEntries(formData));
    const exists = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (exists) throw new AppError("An account with this email already exists. Try signing in.", "EMAIL_TAKEN");
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        rewardAccount: { create: { balance: 100, lifetimeEarned: 100, transactions: { create: { type: "EARNED", points: 100, description: "Welcome bonus" } } } },
      },
    });
    await sendVerificationEmail(user);
    // Notify admin of new registration
    dispatch(() => sendEmail({
      to: "kazinomanimtiyaz7656@gmail.com",
      template: "admin.new_registration",
      rendered: {
        subject: `🎉 New user: ${user.name}`,
        html: `<div style="font-family:sans-serif"><h2>New registration on NOVA</h2><p><b>Name:</b> ${user.name}</p><p><b>Email:</b> ${user.email}</p><p><b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p></div>`,
        text: `New user registered: ${user.name} (${user.email}) at ${new Date().toLocaleString("en-IN")}`,
      },
    }));
    await notify(user.id, "PROMOTIONAL", "Welcome to NOVA", "You've got 100 NOVA points to start. Use code WELCOME500 for ₹500 off your first order above ₹10,000.", "/shop");
    await createSession(user.id);
    await mergeGuestCart(user.id);
    return { redirectTo: safeNext(formData.get("next"), "/account") };
  });
  return res;
}

export async function loginAction(_: unknown, formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  return action("auth.login", async () => {
    const raw = Object.fromEntries(formData);
    const input = loginSchema.parse(raw);
    await rateLimit("login", { limit: 10, windowMs: 10 * 60_000, key: input.email });
    const user = await db.user.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !valid) throw new AppError("Incorrect email or password.", "INVALID_CREDENTIALS", 401);
    await createSession(user.id);
    await mergeGuestCart(user.id);
    const fallback = user.role === "ADMIN" ? "/admin" : "/account";
    return { redirectTo: safeNext(formData.get("next"), fallback) };
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_: unknown, formData: FormData): Promise<ActionResult<null>> {
  return action(
    "account.profile",
    async () => {
      const user = await requireUser();
      const input = profileSchema.parse(Object.fromEntries(formData));
      await db.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone || null } });
      revalidatePath("/account", "layout");
      return null;
    },
    "Profile updated",
  );
}

export async function changePasswordAction(_: unknown, formData: FormData): Promise<ActionResult<null>> {
  return action(
    "account.password",
    async () => {
      const user = await requireUser();
      await rateLimit("change-password", { limit: 5, windowMs: 10 * 60_000, key: user.id });
      const input = changePasswordSchema.parse(Object.fromEntries(formData));
      const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!row.passwordHash || !(await verifyPassword(input.currentPassword, row.passwordHash))) {
        throw new AppError("Your current password is incorrect.", "INVALID_PASSWORD");
      }
      const sid = await currentSessionId();
      await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
      // Sign out every other device.
      await db.session.deleteMany({ where: { userId: user.id, ...(sid ? { id: { not: sid } } : {}) } });
      const rendered = passwordChangedTemplate(row.name, "changed");
      dispatch(() => sendEmail({ to: row.email, userId: row.id, template: "security.password_changed", rendered }));
      return null;
    },
    "Password changed. Other devices have been signed out.",
  );
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult<null>> {
  return action(
    "account.revokeSession",
    async () => {
      const user = await requireUser();
      const sid = await currentSessionId();
      if (sessionId === sid) throw new AppError("Use Sign out to end your current session.");
      await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
      revalidatePath("/account/security");
      return null;
    },
    "Session revoked",
  );
}

// ─────────────────────────── Email verification ───────────────────────────

async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const raw = await issueAuthToken(user.id, "EMAIL_VERIFY");
  const rendered = verifyEmailTemplate(user.name, `${appUrl()}/verify-email?token=${raw}`);
  dispatch(() => sendEmail({ to: user.email, userId: user.id, template: "account.verify_email", rendered }));
}

export async function resendVerificationAction(): Promise<ActionResult<null>> {
  return action(
    "account.resendVerification",
    async () => {
      const u = await requireUser();
      await rateLimit("verify-resend", { limit: 3, windowMs: 10 * 60_000, key: u.id });
      const row = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { id: true, name: true, email: true, emailVerified: true } });
      if (row.emailVerified) throw new AppError("Your email is already verified.", "ALREADY_VERIFIED");
      await sendVerificationEmail(row);
      return null;
    },
    "Verification email sent. Check your inbox.",
  );
}

/** Confirm an email address. Runs on an explicit button press so link scanners can't trigger it. */
export async function verifyEmailAction(token: string): Promise<ActionResult<null>> {
  return action("account.verifyEmail", async () => {
    await rateLimit("verify-email", { limit: 20, windowMs: 10 * 60_000 });
    const t = await consumeAuthToken(String(token ?? ""), "EMAIL_VERIFY");
    if (!t) throw new AppError("This verification link is invalid or has expired. Request a new one from your account.", "TOKEN_INVALID");
    await db.user.update({ where: { id: t.userId }, data: { emailVerified: t.user.emailVerified ?? new Date() } });
    revalidatePath("/account", "layout");
    return null;
  }, "Email verified");
}

// ─────────────────────────── Password reset ───────────────────────────

/**
 * Always answers the same way whether or not the account exists, so the form
 * can't be used to discover which emails are registered.
 */
export async function requestPasswordResetAction(_: unknown, formData: FormData): Promise<ActionResult<{ email: string }>> {
  return action("auth.forgotPassword", async () => {
    const { email } = forgotPasswordSchema.parse(Object.fromEntries(formData));
    await rateLimit("forgot-password", { limit: 5, windowMs: 15 * 60_000 });
    await rateLimit("forgot-password-email", { limit: 3, windowMs: 15 * 60_000, key: email });
    const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
    if (user) {
      const raw = await issueAuthToken(user.id, "PASSWORD_RESET");
      const rendered = passwordResetTemplate(user.name, `${appUrl()}/reset-password?token=${raw}`);
      dispatch(() => sendEmail({ to: user.email, userId: user.id, template: "security.password_reset", rendered }));
    }
    return { email };
  });
}

export async function resetPasswordAction(_: unknown, formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  return action("auth.resetPassword", async () => {
    await rateLimit("reset-password", { limit: 10, windowMs: 15 * 60_000 });
    const input = resetPasswordSchema.parse(Object.fromEntries(formData));
    const t = await consumeAuthToken(input.token, "PASSWORD_RESET");
    if (!t) throw new AppError("This reset link is invalid or has expired. Request a new one.", "TOKEN_INVALID");
    await db.$transaction([
      // Clicking the emailed link proves ownership of the address.
      db.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(input.password), emailVerified: t.user.emailVerified ?? new Date() } }),
      db.session.deleteMany({ where: { userId: t.userId } }),
      db.authToken.deleteMany({ where: { userId: t.userId, type: "PASSWORD_RESET", usedAt: null } }),
    ]);
    const rendered = passwordChangedTemplate(t.user.name, "reset");
    dispatch(() => sendEmail({ to: t.user.email, userId: t.userId, template: "security.password_changed", rendered }));
    return { redirectTo: "/login?reset=1" };
  });
}

// ─────────────────────────── Sign-in methods ───────────────────────────

/** For accounts created with Google: add a password so email sign-in works too. */
export async function setPasswordAction(_: unknown, formData: FormData): Promise<ActionResult<null>> {
  return action(
    "account.setPassword",
    async () => {
      const u = await requireUser();
      await rateLimit("set-password", { limit: 5, windowMs: 10 * 60_000, key: u.id });
      const input = setPasswordSchema.parse(Object.fromEntries(formData));
      const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
      if (row.passwordHash) throw new AppError("You already have a password. Use Change password instead.", "HAS_PASSWORD");
      await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
      const rendered = passwordChangedTemplate(row.name, "set");
      dispatch(() => sendEmail({ to: row.email, userId: row.id, template: "security.password_changed", rendered }));
      // No revalidatePath here: the client toasts first, then refreshes (the form unmounts on refresh).
      return null;
    },
    "Password added. You can now sign in with email too.",
  );
}

export async function unlinkGoogleAction(): Promise<ActionResult<null>> {
  return action(
    "account.unlinkGoogle",
    async () => {
      const u = await requireUser();
      const row = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { passwordHash: true, accounts: { select: { id: true, provider: true } } } });
      const google = row.accounts.find((a) => a.provider === "google");
      if (!google) throw new AppError("No Google account is connected.", "NOT_LINKED");
      if (!row.passwordHash && row.accounts.length <= 1) throw new AppError("Add a password first — otherwise you'd have no way to sign in.", "LAST_METHOD");
      await db.account.delete({ where: { id: google.id } });
      revalidatePath("/account/security");
      return null;
    },
    "Google disconnected",
  );
}

export async function updateEmailPreferencesAction(input: unknown): Promise<ActionResult<null>> {
  return action(
    "account.emailPreferences",
    async () => {
      const u = await requireUser();
      const data = emailPreferencesSchema.parse(input);
      await db.user.update({ where: { id: u.id }, data });
      revalidatePath("/account/notifications");
      return null;
    },
    "Email preferences saved",
  );
}
