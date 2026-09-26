// End-to-end tests for Google sign-in, password reset, email verification and transactional email.
// Needs: the app running with EMAIL_PROVIDER=smtp → tests/mail-catcher.mjs, and GOOGLE_* pointed at tests/mock-google.mjs.
// See README → "Tests".
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const MAIL = process.env.MAIL_HTTP ?? "http://localhost:2580";
const DB = process.env.DATABASE_URL?.split("?")[0] ?? "postgresql://nova:nova_dev_pw@localhost:5432/nova";
const sql = (q) => execSync(`psql "${DB}" -tAc ${JSON.stringify(q)}`).toString().trim();
const results = [];
const ok = (name, cond, info = "") => { results.push(`${cond ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); console.log(results.at(-1)); };
const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, String(e.message).split("\n")[0].slice(0, 220)); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function inbox(to, subjectRe, { timeout = 15000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const list = await (await fetch(`${MAIL}/messages?to=${encodeURIComponent(to)}`)).json();
    const hit = list.filter((m) => subjectRe.test(m.subject)).at(-1);
    if (hit) return hit;
    await sleep(400);
  }
  return null;
}
const count = async (to, subjectRe) => (await (await fetch(`${MAIL}/messages?to=${encodeURIComponent(to)}`)).json()).filter((m) => subjectRe.test(m.subject)).length;
const linkIn = (msg, path) => msg?.text.match(new RegExp(`https?://[^\\s]+${path}\\?token=[A-Za-z0-9_-]+`))?.[0] ?? null;

await fetch(`${MAIL}/messages`, { method: "DELETE" });
const browser = await chromium.launch();
const errs = [];
const fresh = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  p.on("dialog", (d) => d.accept().catch(() => {}));
  return { ctx, p, go: (path) => p.goto(B + path, { waitUntil: "domcontentloaded", timeout: 60000 }), toast: (re) => p.locator("[data-sonner-toast]").filter({ hasText: re }).first().waitFor({ timeout: 20000 }) };
};
const login = async (s, email, password, next = "/account") => {
  await s.go(`/login?next=${encodeURIComponent(next)}`);
  await s.p.fill("#email", email);
  await s.p.fill("#password", password);
  await s.p.click("button[type=submit]");
  await s.p.waitForURL((u) => u.pathname === next, { timeout: 30000 });
};

const stamp = Date.now();
const user = { name: "Meera Iyer", email: `meera.${stamp}@example.in`, pw: "Meera@2026", pw2: "NewMeera@2026" };

// ── Registration → verification email ──
const a = await fresh();
await step("register sends verification email", async () => {
  await a.go("/register");
  await a.p.fill("#name", user.name);
  await a.p.fill("#email", user.email);
  await a.p.fill("#password", user.pw);
  await a.p.click("button[type=submit]");
  await a.p.waitForURL((u) => u.pathname === "/account");
  const msg = await inbox(user.email, /confirm your email/i);
  const link = linkIn(msg, "/verify-email");
  const banner = await a.p.getByText("Verify your email.").isVisible();
  const logged = sql(`select text from "EmailLog" where "to"='${user.email}' and template='account.verify_email' order by "createdAt" desc limit 1`);
  ok("register sends verification email", !!link && banner && !/token=/.test(logged) && /secure link/.test(logged), `SMTP delivered, banner shown, token redacted in log`);
  user.verifyLink = link;
});

await step("email verification confirms account", async () => {
  await a.p.goto(user.verifyLink, { waitUntil: "domcontentloaded" });
  const before = sql(`select "emailVerified" is not null from "User" where email='${user.email}'`);
  await a.p.getByRole("button", { name: "Confirm email" }).click();
  await a.p.getByText("Email verified").waitFor();
  const after = sql(`select "emailVerified" is not null from "User" where email='${user.email}'`);
  await a.go("/account");
  const banner = await a.p.getByText("Verify your email.").count();
  await a.p.goto(user.verifyLink, { waitUntil: "domcontentloaded" });
  const reused = await a.p.getByText("Link invalid or expired").isVisible();
  ok("email verification confirms account", before === "f" && after === "t" && banner === 0 && reused, "verified in DB, banner gone, link single-use");
});

await step("resend verification rejected once verified", async () => {
  const r = sql(`select count(*) from "AuthToken" t join "User" u on u.id=t."userId" where u.email='${user.email}' and t.type='EMAIL_VERIFY' and t."usedAt" is null`);
  ok("no dangling verification tokens", r === "0", `unused tokens=${r}`);
});

// ── Forgot / reset password ──
const b = await fresh();
await step("forgot password: no account enumeration", async () => {
  await b.go("/forgot-password");
  await b.p.fill("#email", `nobody.${stamp}@example.in`);
  await b.p.getByRole("button", { name: "Send reset link" }).click();
  await b.p.getByText("Check your inbox").waitFor();
  await sleep(1500);
  const n = await count(`nobody.${stamp}@example.in`, /reset/i);
  ok("forgot password: no account enumeration", n === 0, "same confirmation shown, nothing sent");
});

await step("forgot password: reset email + link", async () => {
  await b.go(`/forgot-password?email=${encodeURIComponent(user.email)}`);
  await b.p.getByRole("button", { name: "Send reset link" }).click();
  await b.p.getByText("Check your inbox").waitFor();
  const resend = await b.p.getByRole("button", { name: /Resend in/ }).isDisabled();
  const msg = await inbox(user.email, /reset your nova password/i);
  user.resetLink = linkIn(msg, "/reset-password");
  ok("forgot password: reset email + link", !!user.resetLink && resend, "resend has a cooldown");
});

await step("reset password: validation, success, sessions revoked", async () => {
  const sessionsBefore = Number(sql(`select count(*) from "Session" s join "User" u on u.id=s."userId" where u.email='${user.email}'`));
  await b.p.goto(user.resetLink, { waitUntil: "domcontentloaded" });
  await b.p.getByText("Choose a new password").waitFor();
  await b.p.fill("#password", user.pw2);
  await b.p.fill("#confirmPassword", "Mismatch@1");
  await b.p.getByRole("button", { name: "Reset password" }).click();
  await b.p.getByText("Passwords don't match.").waitFor();
  await b.p.fill("#password", user.pw2);
  await b.p.fill("#confirmPassword", user.pw2);
  await b.p.getByRole("button", { name: "Reset password" }).click();
  await b.p.waitForURL(/\/login\?reset=1/);
  const banner = await b.p.getByText("Your password has been reset").isVisible();
  const sessionsAfter = Number(sql(`select count(*) from "Session" s join "User" u on u.id=s."userId" where u.email='${user.email}'`));
  await a.go("/account");
  const kicked = /\/login/.test(a.p.url());
  const changed = await inbox(user.email, /password was changed/i);
  ok("reset password: validation, success, sessions revoked", banner && sessionsBefore >= 1 && sessionsAfter === 0 && kicked && !!changed, `sessions ${sessionsBefore}→${sessionsAfter}, other device signed out, notice emailed`);
});

await step("reset link is single-use; old password rejected; new works", async () => {
  await b.p.goto(user.resetLink, { waitUntil: "domcontentloaded" });
  const expired = await b.p.getByText("This link has expired").isVisible();
  await b.go("/login");
  await b.p.fill("#email", user.email);
  await b.p.fill("#password", user.pw);
  await b.p.click("button[type=submit]");
  await b.p.getByText("Incorrect email or password.").waitFor();
  await login(b, user.email, user.pw2);
  ok("reset link is single-use; old password rejected; new works", expired, "");
});

await step("tampered reset token rejected", async () => {
  await b.go("/reset-password?token=" + "x".repeat(43));
  ok("tampered reset token rejected", await b.p.getByText("This link has expired").isVisible());
});

// ── Google sign-in ──
const g = { email: `arjun.${stamp}@gmail.com`, name: "Arjun Nair" };
async function googleConsent(s, { email, name, verified = true, action = "allow" }) {
  await s.p.waitForURL(/localhost:4455\/auth/);
  await s.p.fill("input[name=email]", email);
  if (name) await s.p.fill("input[name=name]", name);
  if (!verified) await s.p.uncheck("input[name=verified]");
  await s.p.click(`button[value=${action}]`);
}

const c = await fresh();
await step("Google sign-up creates verified account", async () => {
  await c.go("/login?next=/wishlist");
  await c.p.getByRole("link", { name: "Continue with Google" }).click();
  await googleConsent(c, g);
  await c.p.waitForURL((u) => u.pathname === "/wishlist", { timeout: 30000 });
  const row = sql(`select u."emailVerified" is not null, u."passwordHash" is null, a.provider, a.email, r.balance from "User" u join "Account" a on a."userId"=u.id join "RewardAccount" r on r."userId"=u.id where u.email='${g.email}'`);
  const welcome = await inbox(g.email, /^Welcome to NOVA$/);
  ok("Google sign-up creates verified account", row === `t|t|google|${g.email}|100` && !!welcome, `respects ?next, ${row}, welcome email`);
});

await step("Google-only account: add password, unlink guarded", async () => {
  await c.go("/account/security");
  const disabled = await c.p.getByRole("button", { name: "Disconnect" }).isDisabled();
  await c.p.getByText("Add a password").first().waitFor();
  await c.p.fill("#sp-new", "Arjun@2026");
  await c.p.fill("#sp-conf", "Arjun@2026");
  await c.p.getByRole("button", { name: "Add password" }).click();
  await c.toast(/Password added/);
  await c.p.getByRole("heading", { name: "Change password" }).waitFor();
  const has = sql(`select "passwordHash" is not null from "User" where email='${g.email}'`);
  const notice = await inbox(g.email, /password was added/i);
  ok("Google-only account: add password, unlink guarded", disabled && has === "t" && !!notice, "disconnect disabled until a password exists");
});

await step("Google sign-in again reuses account", async () => {
  const s = await fresh();
  await s.go("/login");
  await s.p.getByRole("link", { name: "Continue with Google" }).click();
  await googleConsent(s, g);
  await s.p.waitForURL((u) => u.pathname === "/account");
  const users = sql(`select count(*) from "User" where email='${g.email}'`);
  const accts = sql(`select count(*) from "Account" a join "User" u on u.id=a."userId" where u.email='${g.email}'`);
  ok("Google sign-in again reuses account", users === "1" && accts === "1");
  await s.ctx.close();
});

await step("Google cancel shows message", async () => {
  const s = await fresh();
  await s.go("/login");
  await s.p.getByRole("link", { name: "Continue with Google" }).click();
  await googleConsent(s, { email: g.email, action: "deny" });
  await s.p.waitForURL(/\/login\?error=google_cancelled/);
  ok("Google cancel shows message", await s.p.getByText("Google sign-in was cancelled.").isVisible());
  await s.ctx.close();
});

await step("Google unverified email cannot take over existing account", async () => {
  const s = await fresh();
  await s.go("/login");
  await s.p.getByRole("link", { name: "Continue with Google" }).click();
  await googleConsent(s, { email: "customer@nova.dev", verified: false });
  await s.p.waitForURL(/error=google_unverified/);
  const linked = sql(`select count(*) from "Account" a join "User" u on u.id=a."userId" where u.email='customer@nova.dev'`);
  ok("Google unverified email cannot take over existing account", linked === "0" && (await s.p.getByText(/isn't verified/).isVisible()));
  await s.ctx.close();
});

await step("forged OAuth state rejected", async () => {
  const s = await fresh();
  await s.go("/api/auth/google/callback?code=abc&state=forged");
  await s.p.waitForURL(/error=google_expired/);
  ok("forged OAuth state rejected", true, "no session created");
  await s.ctx.close();
});

await step("Google verified email links existing account", async () => {
  const s = await fresh();
  await s.go("/login");
  await s.p.getByRole("link", { name: "Continue with Google" }).click();
  await googleConsent(s, { email: "customer@nova.dev", name: "Riya S" });
  await s.p.waitForURL((u) => u.pathname === "/account");
  const hi = await s.p.getByText("Hi, Riya").isVisible();
  const linked = sql(`select count(*) from "Account" a join "User" u on u.id=a."userId" where u.email='customer@nova.dev' and a.provider='google'`);
  const notice = await inbox("customer@nova.dev", /Google sign-in added/i);
  ok("Google verified email links existing account", hi && linked === "1" && !!notice, "signed in as Riya, security notice emailed");
  await s.ctx.close();
});

await step("connect + disconnect Google from Security", async () => {
  await b.go("/account/security");
  await b.p.getByRole("link", { name: "Connect Google" }).click();
  await googleConsent(b, { email: `meera.work.${stamp}@gmail.com`, name: "Meera I" });
  await b.p.waitForURL(/\/account\/security\?linked=google/);
  await b.p.getByText(`Connected as meera.work.${stamp}@gmail.com`).waitFor();
  const n1 = sql(`select count(*) from "Account" a join "User" u on u.id=a."userId" where u.email='${user.email}'`);
  await b.p.getByRole("button", { name: "Disconnect" }).click();
  await b.toast(/Google disconnected/);
  const n2 = sql(`select count(*) from "Account" a join "User" u on u.id=a."userId" where u.email='${user.email}'`);
  ok("connect + disconnect Google from Security", n1 === "1" && n2 === "0");
});

await step("Google account can't be linked to two users", async () => {
  await b.go("/account/security");
  await b.p.getByRole("link", { name: "Connect Google" }).click();
  await googleConsent(b, g); // already belongs to Arjun
  await b.p.waitForURL(/\/account\/security\?error=google_in_use/);
  ok("Google account can't be linked to two users", await b.p.getByText(/already connected to a different NOVA account/).isVisible());
});

// ── Order emails + preferences ──
const adm = await fresh();
await step("order shipped email (SMTP) from admin fulfilment", async () => {
  await login(adm, "admin@nova.dev", "Admin@12345", "/admin");
  const [id, num] = sql(`select o.id, o."orderNumber" from "Order" o join "User" u on u.id=o."userId" where u.email='customer@nova.dev' and o.status='CONFIRMED' order by o."createdAt" desc limit 1`).split("|");
  user.riyaOrder = { id, num };
  await adm.go("/admin/orders/" + id);
  await adm.p.getByRole("button", { name: "Mark shipped" }).click();
  await adm.toast(/updated|Status/i);
  const msg = await inbox("customer@nova.dev", new RegExp(`Order ${num} has shipped`));
  ok("order shipped email (SMTP) from admin fulfilment", !!msg && msg.html.includes(num) && /Track your order/.test(msg.html), num);
});

await step("email preference off → shipping email skipped (logged)", async () => {
  const r = await fresh();
  await login(r, "customer@nova.dev", "Customer@123", "/account/notifications");
  await r.p.getByRole("switch", { name: "Shipping updates by email" }).uncheck({ force: true });
  await r.toast(/preferences saved/i);
  const pref = sql(`select "emailOrderUpdates" from "User" where email='customer@nova.dev'`);
  await adm.go("/admin/orders/" + user.riyaOrder.id);
  await adm.p.getByRole("button", { name: "Out for delivery" }).click();
  await adm.toast(/updated|Status/i);
  await sleep(2500);
  const sent = await count("customer@nova.dev", /out for delivery/i);
  const skipped = sql(`select status from "EmailLog" where "to"='customer@nova.dev' and template='order.out_for_delivery' order by "createdAt" desc limit 1`);
  await r.p.getByRole("switch", { name: "Shipping updates by email" }).check({ force: true });
  await r.toast(/preferences saved/i);
  ok("email preference off → shipping email skipped (logged)", pref === "f" && sent === 0 && skipped === "SKIPPED", `pref=${pref}, log=${skipped}`);
  await r.ctx.close();
});

await step("admin email log, preview and test email", async () => {
  await adm.go("/admin/emails");
  await adm.p.getByRole("heading", { name: "Emails" }).waitFor();
  const rows = await adm.p.locator("tbody tr").count();
  await adm.p.getByRole("button", { name: "Send test email" }).click();
  await adm.toast(/Test email sent/);
  const test = await inbox("admin@nova.dev", /NOVA test email/);
  await adm.p.getByRole("button", { name: /Preview/ }).first().click();
  const frame = adm.p.frameLocator("iframe[title^='Email preview']");
  await frame.locator("body").waitFor();
  const previewOk = /NOVA/.test(await frame.locator("body").innerText());
  const id = sql(`select id from "EmailLog" order by "createdAt" desc limit 1`);
  const asAdmin = await adm.p.request.get(`${B}/admin/emails/${id}/preview`);
  const cust = await fresh();
  await login(cust, "customer@nova.dev", "Customer@123");
  const asCustomer = await cust.p.request.get(`${B}/admin/emails/${id}/preview`, { maxRedirects: 0 });
  ok("admin email log, preview and test email", rows > 5 && !!test && previewOk && asAdmin.status() === 200 && asCustomer.status() === 403, `rows=${rows}, customer preview → ${asCustomer.status()}`);
  await cust.ctx.close();
});

await step("every email delivered via SMTP (none failed)", async () => {
  const failed = sql(`select count(*) from "EmailLog" where status='FAILED'`);
  const sent = sql(`select count(*) from "EmailLog" where status='SENT' and provider='smtp'`);
  ok("every email delivered via SMTP (none failed)", failed === "0" && Number(sent) >= 8, `sent=${sent} failed=${failed}`);
});

await browser.close();
console.log(`\n${results.filter((r) => r.startsWith("FAIL")).length} failures / ${results.length}`);
console.log("page errors:", JSON.stringify(errs.slice(0, 5)));
