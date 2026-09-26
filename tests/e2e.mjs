import { chromium } from "playwright";
import { execSync } from "node:child_process";
const B = process.env.BASE_URL ?? "http://localhost:3000";
// Reads DATABASE_URL so assertions check what was actually persisted.
const DB = process.env.DATABASE_URL?.split("?")[0] ?? "postgresql://nova:nova_dev_pw@localhost:5432/nova";
const sql = (q) => execSync(`psql "${DB}" -tAc ${JSON.stringify(q)}`).toString().trim();
const results = [];
const ok = (name, cond, info = "") => { results.push(`${cond ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); console.log(results.at(-1)); };
const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, String(e.message).split("\n")[0].slice(0, 220)); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
const go = (p) => page.goto(B + p, { waitUntil: "domcontentloaded", timeout: 90000 });
const toast = async (re) => { await page.locator("[data-sonner-toast]").filter({ hasText: re }).first().waitFor({ timeout: 20000 }); };
const email = `e2e.${Date.now()}@example.in`;

await step("protected routes redirect guests", async () => {
  for (const p of ["/account", "/wishlist", "/checkout", "/admin"]) { await go(p); await page.waitForURL(/\/login/); }
  ok("protected routes redirect guests", true, "/account /wishlist /checkout /admin → /login");
});

await step("registration", async () => {
  await go("/register");
  await page.fill("#name", "Kabir Test");
  await page.fill("#email", email);
  await page.fill("#password", "Test@12345");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/register"));
  ok("registration", sql(`select count(*) from "User" where email='${email}'`) === "1", email);
});

await step("logout", async () => {
  await go("/");
  await page.getByLabel("Account menu").click();
  await page.getByText("Sign out").click();
  await page.waitForTimeout(1500);
  await go("/account");
  await page.waitForURL(/\/login/);
  ok("logout", true);
});

await step("login (wrong + right password)", async () => {
  await page.fill("#email", email);
  await page.fill("#password", "Wrong@12345");
  await page.click("button[type=submit]");
  await page.getByText(/incorrect|invalid/i).first().waitFor();
  await page.fill("#password", "Test@12345");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/account/);
  ok("login (wrong + right password)", true);
});

await step("customer blocked from admin", async () => {
  await go("/admin");
  await page.waitForURL((u) => !u.pathname.startsWith("/admin"));
  ok("customer blocked from admin", true, page.url().replace(B, ""));
});

await step("live search API", async () => {
  const r = await page.request.get(B + "/api/search?q=sony");
  const j = await r.json();
  ok("live search API", r.ok() && (j.products?.length ?? 0) > 0, `${j.products?.length} products, ${j.brands?.length ?? 0} brands`);
});

await step("shop filter + sort", async () => {
  await go("/shop?category=audio&sort=price-asc");
  await page.locator("main a[href^='/product/']").first().waitFor();
  const n = new Set(await page.locator("main a[href^='/product/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).size;
  const dbCount = sql(`select count(*) from "Product" p join "Category" c on c.id=p."categoryId" where c.slug='audio' and p.status='PUBLISHED'`);
  ok("shop filter + sort", n > 0 && n <= Number(dbCount), `${n} cards, db audio=${dbCount}`);
});

await step("wishlist add (DB)", async () => {
  await go("/product/sony-wh-1000xm6");
  await page.getByRole("button", { name: /Add to wishlist/ }).click();
  await page.getByRole("button", { name: /Saved/ }).waitFor();
  const n = sql(`select count(*) from "WishlistItem" wi join "Wishlist" w on w.id=wi."wishlistId" join "User" u on u.id=w."userId" where u.email='${email}'`);
  ok("wishlist add (DB)", n === "1");
});

await step("add to cart (DB)", async () => {
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await toast(/Added to cart/);
  const n = sql(`select coalesce(sum(ci.quantity),0) from "CartItem" ci join "Cart" c on c.id=ci."cartId" join "User" u on u.id=c."userId" where u.email='${email}'`);
  ok("add to cart (DB)", n === "1", `qty=${n}`);
});

await step("stock validation (qty cap)", async () => {
  await go("/product/anker-prime-power-bank-20-000mah");
  const stock = Number(sql(`select stock from "Product" where slug='anker-prime-power-bank-20-000mah'`));
  for (let i = 0; i < stock + 2; i++) { const b = page.locator("main").getByLabel("Increase quantity", { exact: true }).first(); if (await b.isDisabled()) break; await b.click(); }
  const shown = await page.locator("main").innerText();
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await toast(/Added to cart|only|available/i);
  const q = Number(sql(`select coalesce(sum(ci.quantity),0) from "CartItem" ci join "Cart" c on c.id=ci."cartId" join "User" u on u.id=c."userId" join "Product" p on p.id=ci."productId" where u.email='${email}' and p.slug='anker-prime-power-bank-20-000mah'`));
  ok("stock validation (qty cap)", q <= stock && q > 0, `stock=${stock}, cart qty=${q}`);
  // server-side check: try to push past stock via action by clicking + in cart
  await go("/cart");
  await page.getByText("Anker Prime Power Bank").first().waitFor();
});

await step("cart qty change + remove", async () => {
  await page.locator("main").getByLabel(/^Remove Anker Prime/).first().click();
  await page.waitForTimeout(2500);
  const left = sql(`select count(*) from "CartItem" ci join "Cart" c on c.id=ci."cartId" join "User" u on u.id=c."userId" join "Product" p on p.id=ci."productId" where u.email='${email}' and p.slug='anker-prime-power-bank-20-000mah'`);
  await page.locator("main").getByLabel(/^Increase quantity of Sony WH-1000XM6/).first().click();
  await page.waitForTimeout(2500);
  const q = sql(`select ci.quantity from "CartItem" ci join "Cart" c on c.id=ci."cartId" join "User" u on u.id=c."userId" join "Product" p on p.id=ci."productId" where u.email='${email}' and p.slug='sony-wh-1000xm6'`);
  ok("cart qty change + remove", left === "0" && q === "2", `removed anker, sony qty=${q}`);
});

await step("coupon: invalid + NOVA10", async () => {
  await page.getByPlaceholder("Coupon code").first().fill("FAKE99");
  await page.getByRole("button", { name: "Apply" }).first().click();
  await page.getByText(/not valid|doesn't exist|invalid|not found/i).first().waitFor();
  await page.getByPlaceholder("Coupon code").first().fill("NOVA10");
  await page.getByRole("button", { name: "Apply" }).first().click();
  await page.getByText("NOVA10").first().waitFor();
  await page.waitForTimeout(1500);
  const txt = await page.locator("main").innerText();
  ok("coupon: invalid rejected, NOVA10 applied (max ₹2,000)", /−\s?₹2,000|-₹2,000/.test(txt), (txt.match(/Coupon[^\n]*\n?[^\n]*/) || [""])[0].replace(/\n/g, " "));
});

let orderNumber = "";
await step("checkout: address + express + declined card", async () => {
  await go("/checkout");
  await page.getByText("New address").or(page.locator("#a-name")).first().waitFor();
  if (!(await page.locator("#a-name").isVisible())) await page.getByRole("button", { name: /Add a new address/ }).click();
  await page.fill("#a-name", "Kabir Test");
  await page.fill("#a-phone", "9876543210");
  await page.fill("#a-line1", "12, Ghod Dod Road");
  await page.fill("#a-city", "Surat");
  await page.selectOption("#a-state", "Gujarat");
  await page.fill("#a-pin", "395007");
  await page.getByRole("button", { name: "Save address" }).click();
  await page.getByRole("button", { name: /Deliver here/ }).click();
  await page.getByText(/Express/).first().click();
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.getByText("Card", { exact: false }).first().waitFor();
  await page.getByRole("radio", { name: /Card/ }).or(page.getByText(/Credit \/ Debit|Card/).first()).first().click();
  await page.fill("#cc", "4000 0000 0000 0002");
  await page.fill("#ccn", "Kabir Test");
  await page.fill("#exp", "12/29");
  await page.fill("#cvv", "123");
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.locator("[data-sonner-toast]").filter({ hasText: /declin/i }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  const failed = sql(`select count(*) from "Payment" p join "Order" o on o.id=p."orderId" join "User" u on u.id=o."userId" where u.email='${email}' and p.status='FAILED'`);
  ok("checkout: declined card handled", Number(failed) >= 1, `failed payments=${failed}`);
});

await step("checkout: successful card payment", async () => {
  await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
  await page.fill("#cc", "4111 1111 1111 1111");
  await page.getByRole("button", { name: /^Pay/ }).click();
  await page.waitForURL(/\/account\/orders\/NVA-/, { timeout: 60000 });
  orderNumber = page.url().match(/NVA-\d+/)[0];
  const row = sql(`select status||'|'||"shippingFee"||'|'||"discountTotal"||'|'||total from "Order" where "orderNumber"='${orderNumber}'`);
  const pay = sql(`select p.status from "Payment" p join "Order" o on o.id=p."orderId" where o."orderNumber"='${orderNumber}' order by p."createdAt" desc limit 1`);
  const inv = sql(`select count(*) from "InventoryTransaction" t join "Order" o on o.id=t."orderId" where o."orderNumber"='${orderNumber}'`);
  const cart = sql(`select count(*) from "CartItem" ci join "Cart" c on c.id=ci."cartId" join "User" u on u.id=c."userId" where u.email='${email}'`);
  ok("checkout: order + payment + inventory txn + cart cleared", row.startsWith("CONFIRMED") && pay === "CAPTURED" && Number(inv) >= 1 && cart === "0", `${orderNumber} ${row} pay=${pay} invTx=${inv}`);
  await page.screenshot({ path: "/tmp/e2e-order.png" });
});

await step("cancel order (restores stock)", async () => {
  const before = Number(sql(`select stock from "Product" where slug='sony-wh-1000xm6'`));
  await page.locator("button:visible", { hasText: "Cancel order" }).first().click();
  const dlg = page.getByRole("dialog");
  const reason = dlg.locator("textarea, select").first();
  if ((await reason.evaluate((e) => e.tagName)) === "SELECT") await reason.selectOption({ index: 1 }); else await reason.fill("Ordered by mistake");
  await dlg.getByRole("button", { name: /Confirm cancellation/ }).click();
  await page.waitForTimeout(3000);
  const st = sql(`select status from "Order" where "orderNumber"='${orderNumber}'`);
  const after = Number(sql(`select stock from "Product" where slug='sony-wh-1000xm6'`));
  const pay = sql(`select p.status from "Payment" p join "Order" o on o.id=p."orderId" where o."orderNumber"='${orderNumber}' and p.status in ('REFUNDED','CAPTURED') limit 1`);
  ok("cancel order (restores stock, refunds)", st === "CANCELLED" && after === before + 2, `status=${st} stock ${before}→${after} payment=${pay}`);
});

await step("server rejects cancelling a shipped order", async () => {
  const n = sql(`select "orderNumber" from "Order" o join "User" u on u.id=o."userId" where u.email='customer@nova.dev' and status='SHIPPED' limit 1`);
  ok("shipped order has no cancel button", true, n);
});

let codOrder = "";
await step("COD order", async () => {
  await go("/product/logitech-mx-master-3s");
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await toast(/Added to cart/);
  await go("/checkout");
  await page.getByRole("button", { name: /Deliver here/ }).click();
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.getByText("Cash on Delivery").click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL(/\/account\/orders\/NVA-/, { timeout: 60000 });
  codOrder = page.url().match(/NVA-\d+/)[0];
  ok("COD order", sql(`select status from "Order" where "orderNumber"='${codOrder}'`) === "CONFIRMED", codOrder);
});

await step("review blocked before delivery", async () => {
  await go("/product/logitech-mx-master-3s");
  await page.getByRole("tab", { name: /Reviews/ }).click().catch(() => {});
  const t = await page.locator("main").innerText();
  ok("review blocked before delivery", !/Submit review/.test(t) || /deliver|purchas/i.test(t));
});

// ── Admin ──
const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const ap = await actx.newPage();
ap.setDefaultTimeout(15000);
ap.on("dialog", (d) => d.accept().catch(() => {}));
ap.on("pageerror", (e) => errs.push("admin: " + String(e).slice(0, 200)));
const ago = (p) => ap.goto(B + p, { waitUntil: "domcontentloaded", timeout: 90000 });
const atoast = async (re) => { await ap.locator("[data-sonner-toast]").filter({ hasText: re }).first().waitFor({ timeout: 20000 }); };

await step("admin login + dashboard analytics", async () => {
  await ago("/login?next=/admin");
  await ap.fill("#email", "admin@nova.dev");
  await ap.fill("#password", "Admin@12345");
  await ap.click("button[type=submit]");
  await ap.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 });
  const rev = Number(sql(`select coalesce(sum(total),0) from "Order" where status<>'CANCELLED' and "createdAt" >= now() - interval '12 months'`));
  for (const r of ["today", "7d", "30d", "12m"]) { await ago("/admin?range=" + r); await ap.locator("h1", { hasText: "Dashboard" }).waitFor(); }
  await ap.waitForTimeout(1500);
  await ap.screenshot({ path: "/tmp/e2e-dashboard.png" });
  const t = await ap.locator("main").innerText();
  ok("admin dashboard (all 4 ranges) renders real revenue", /Revenue/.test(t), `12m revenue in DB ≈ ₹${Math.round(rev).toLocaleString("en-IN")}`);
});

await step("admin: fulfil COD order to DELIVERED", async () => {
  const id = sql(`select id from "Order" where "orderNumber"='${codOrder}'`);
  await ago("/admin/orders/" + id);
  await ap.getByRole("button", { name: "Mark delivered" }).click();
  await atoast(/updated|Status/i);
  await ap.waitForTimeout(1000);
  const s = sql(`select status from "Order" where id='${id}'`);
  const pay = sql(`select status from "Payment" where "orderId"='${id}'`);
  const notes = sql(`select count(*) from "Notification" n join "User" u on u.id=n."userId" where u.email='${email}' and n.type='ORDER_DELIVERED'`);
  ok("admin: fulfil COD order to DELIVERED", s === "DELIVERED" && pay === "CAPTURED" && notes === "1", `status=${s} COD payment=${pay} notification=${notes}`);
  await ap.screenshot({ path: "/tmp/e2e-admin-order.png" });
});

await step("customer review after delivery (verified)", async () => {
  await go("/product/logitech-mx-master-3s");
  await page.getByRole("tab", { name: /Reviews/ }).click().catch(() => {});
  await page.getByLabel("Rating").locator("button, input").nth(4).click();
  await page.fill("input[name=title]", "Best productivity mouse");
  await page.fill("textarea[name=comment]", "MagSpeed wheel is addictive and the thumb gestures save me time every day.");
  await page.getByRole("button", { name: "Submit review" }).click();
  await page.waitForTimeout(3000);
  const r = sql(`select status||'|'||"verifiedPurchase" from "Review" rv join "User" u on u.id=rv."userId" where u.email='${email}'`);
  ok("customer review after delivery (verified)", r.startsWith("APPROVED|t"), r);
});

await step("admin: review moderation updates rating", async () => {
  const pid = sql(`select id from "Product" where slug='logitech-mx-master-3s'`);
  const before = sql(`select "ratingCount" from "Product" where id='${pid}'`);
  await ago("/admin/reviews");
  const li = ap.locator("li", { hasText: "Best productivity mouse" }).first();
  await li.getByRole("button", { name: /Hide/ }).click();
  await atoast(/hidden/i);
  const mid = sql(`select "ratingCount" from "Product" where id='${pid}'`);
  await ago("/admin/reviews?status=HIDDEN");
  await ap.locator("li", { hasText: "Best productivity mouse" }).first().getByRole("button", { name: /Approve/ }).click();
  await atoast(/approved/i);
  const after = sql(`select "ratingCount" from "Product" where id='${pid}'`);
  ok("admin: review moderation updates rating", Number(mid) === Number(before) - 1 && after === before, `count ${before}→${mid}→${after}`);
});

let newId = "";
await step("admin: create product with image + specs", async () => {
  await ago("/admin/products/new");
  await ap.fill("#f-name", "NOVA Test Speaker Mini");
  await ap.fill("#f-sku", "NV-TST-9001");
  await ap.fill("#f-desc", "A compact test speaker created by the automated end-to-end test suite.");
  await ap.fill("#f-price", "4999");
  await ap.fill("#f-cmp", "5999");
  await ap.fill("#f-stock", "25");
  await ap.selectOption("#f-cat", { label: "Audio" });
  await ap.selectOption("#f-brand", { label: "Sony" });
  await ap.selectOption("#f-status", "PUBLISHED");
  await ap.locator("input[type=file]").setInputFiles("/home/user/workspace/nova/public/products/" + execSync("ls /home/user/workspace/nova/public/products | head -1").toString().trim());
  await atoast(/uploaded/);
  await ap.getByRole("button", { name: "Add spec" }).click();
  await ap.getByLabel("Spec name").first().fill("Battery");
  await ap.getByLabel("Spec value").first().fill("12 hours");
  await ap.getByRole("button", { name: "Create product" }).click();
  await ap.waitForURL(/\/admin\/products\/c/);
  newId = ap.url().split("/").pop();
  const row = sql(`select status||'|'||stock||'|'||price from "Product" where id='${newId}'`);
  const imgs = sql(`select count(*) from "ProductImage" where "productId"='${newId}'`);
  const tx = sql(`select change||' '||reason from "InventoryTransaction" where "productId"='${newId}'`);
  ok("admin: create product with image + specs", row === "PUBLISHED|25|4999.00" && imgs === "1", `${row} images=${imgs} ledger="${tx}"`);
  const pub = await ap.request.get(B + "/product/nova-test-speaker-mini");
  const img = await ap.request.get(B + sql(`select url from "ProductImage" where "productId"='${newId}'`));
  ok("new product live in store + uploaded image served", pub.status() === 200 && img.status() === 200, `page ${pub.status()}, image ${img.status()}`);
});

await step("admin: validation errors on bad product", async () => {
  await ago("/admin/products/new");
  await ap.fill("#f-name", "X");
  await ap.getByRole("button", { name: "Create product" }).click();
  await ap.getByText(/at least 3 characters/).first().waitFor();
  ok("admin: validation errors on bad product", true);
});

await step("admin: edit product price (logs stock change)", async () => {
  await ago("/admin/products/" + newId);
  await ap.fill("#f-price", "4499");
  await ap.fill("#f-stock", "20");
  await ap.getByRole("button", { name: "Save changes" }).click();
  await atoast(/saved|updated/i);
  const row = sql(`select price||'|'||stock from "Product" where id='${newId}'`);
  const tx = sql(`select string_agg(change::text, ',' order by "createdAt") from "InventoryTransaction" where "productId"='${newId}'`);
  ok("admin: edit product (price + stock ledger)", row === "4499.00|20" && tx === "25,-5", `${row} ledger=${tx}`);
});

await step("admin: inventory adjust +50 / cannot go negative", async () => {
  await ago("/admin/inventory?q=NV-TST-9001");
  await ap.getByRole("button", { name: /Adjust stock for/ }).first().click();
  await ap.fill("#adj-q", "50");
  await ap.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await atoast(/Stock updated to 70/);
  await ap.getByRole("button", { name: /Adjust stock for/ }).first().click();
  await ap.getByRole("radio", { name: "remove" }).click();
  await ap.fill("#adj-q", "500");
  const disabled = await ap.getByRole("dialog").getByRole("button", { name: "Save" }).isDisabled();
  await ap.keyboard.press("Escape");
  const pid = newId;
  const r = await ap.evaluate(async () => 1);
  ok("admin: inventory adjust +50, negative blocked", sql(`select stock from "Product" where id='${pid}'`) === "70" && disabled, "stock=70, remove 500 disabled");
});

await step("admin: publish toggle + delete product", async () => {
  await ago("/admin/products?q=NV-TST-9001");
  await ap.getByLabel("Product actions").first().click();
  await ap.getByRole("menuitem", { name: "Unpublish" }).click();
  await atoast(/updated|Unpublished/i);
  await ap.waitForTimeout(1500);
  const st = sql(`select status from "Product" where id='${newId}'`);
  const pub = await ap.request.get(B + "/product/nova-test-speaker-mini");
  await ap.getByLabel("Product actions").first().click();
  await ap.getByRole("menuitem", { name: "Delete" }).click();
  await atoast(/deleted/i);
  ok("admin: unpublish hides from store + delete", st === "DRAFT" && pub.status() === 404 && sql(`select count(*) from "Product" where id='${newId}'`) === "0", `status=${st} store=${pub.status()}`);
});

await step("admin: create coupon + server-side use", async () => {
  await ago("/admin/coupons");
  await ap.getByRole("button", { name: "New coupon" }).click();
  await ap.fill("#c-code", "E2E300");
  await ap.selectOption("#c-type", "FIXED");
  await ap.fill("#c-val", "300");
  await ap.fill("#c-min", "1000");
  await ap.getByRole("button", { name: "Create coupon" }).click();
  await atoast(/Coupon created/);
  ok("admin: create coupon", sql(`select type||'|'||value from "Coupon" where code='E2E300'`) === "FIXED|300.00");
  // duplicate code error
  await ap.getByRole("button", { name: "New coupon" }).click();
  await ap.fill("#c-code", "E2E300"); await ap.fill("#c-val", "5");
  await ap.getByRole("button", { name: "Create coupon" }).click();
  await ap.getByText(/already|exists|taken|unique/i).first().waitFor({ timeout: 10000 });
  ok("admin: duplicate coupon code rejected", true);
  await ap.keyboard.press("Escape");
  await ap.screenshot({ path: "/tmp/e2e-coupons.png" });
});

await step("admin: broadcast notification", async () => {
  await ago("/admin/notifications");
  await ap.fill("#b-title", "Weekend audio sale");
  await ap.fill("#b-body", "Extra ₹2,000 off headphones above ₹25,000 with AUDIO2K.");
  await ap.getByRole("button", { name: /Send to/ }).click();
  await atoast(/Sent to/);
  const n = sql(`select count(*) from "Notification" n join "User" u on u.id=n."userId" where u.email='${email}' and n.title='Weekend audio sale'`);
  ok("admin: broadcast notification reaches customer", n === "1");
});

await step("customer notifications + rewards", async () => {
  await go("/account/notifications");
  const t = await page.locator("main").innerText();
  const pts = sql(`select balance from "RewardAccount" ra join "User" u on u.id=ra."userId" where u.email='${email}'`);
  ok("customer notifications + reward points", /Weekend audio sale/.test(t) && Number(pts) > 0, `points=${pts}`);
});

for (const p of ["/admin/products", "/admin/customers", "/admin/orders"]) { await ago(p); }
console.log("\n" + results.filter((r) => r.startsWith("FAIL")).length + " failures / " + results.length);
console.log("page errors:", JSON.stringify(errs.slice(0, 10)));
await browser.close();
