/* NOVA seed — realistic catalog, customers, 12 months of orders, reviews, coupons, inventory ledger, notifications, rewards. */
import { PrismaClient, Prisma, type OrderStatus, type PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRANDS, CATEGORIES, PRODUCTS } from "./data/products";

const db = new PrismaClient();
const D = Prisma.Decimal;

// Deterministic PRNG so the seed is reproducible
let s = 20260924;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const slug = (x: string) => x.toLowerCase().replace(/["″]/g, "").replace(/ē/g, "e").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const daysAgo = (d: number, h = int(9, 22)) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, int(0, 59), int(0, 59), 0);
  return t;
};

const CUSTOMERS: [string, string, string, string][] = [
  // name, city, state, pincode
  ["Aarav Mehta", "Mumbai", "Maharashtra", "400050"],
  ["Diya Sharma", "Bengaluru", "Karnataka", "560034"],
  ["Kabir Singh", "New Delhi", "Delhi", "110017"],
  ["Ananya Iyer", "Chennai", "Tamil Nadu", "600040"],
  ["Vihaan Patel", "Ahmedabad", "Gujarat", "380015"],
  ["Ishita Reddy", "Hyderabad", "Telangana", "500081"],
  ["Arjun Nair", "Kochi", "Kerala", "682020"],
  ["Meera Joshi", "Pune", "Maharashtra", "411001"],
  ["Rohan Gupta", "Gurugram", "Haryana", "122002"],
  ["Saanvi Kapoor", "Jaipur", "Rajasthan", "302001"],
  ["Aditya Rao", "Mysuru", "Karnataka", "570009"],
  ["Nisha Verma", "Lucknow", "Uttar Pradesh", "226010"],
  ["Imran Qureshi", "Surat", "Gujarat", "395007"],
  ["Priya Menon", "Thiruvananthapuram", "Kerala", "695004"],
  ["Karan Malhotra", "Chandigarh", "Chandigarh", "160017"],
  ["Tanvi Desai", "Vadodara", "Gujarat", "390007"],
  ["Siddharth Bose", "Kolkata", "West Bengal", "700019"],
  ["Riya Chatterjee", "Kolkata", "West Bengal", "700091"],
  ["Farhan Sheikh", "Indore", "Madhya Pradesh", "452010"],
  ["Neha Kulkarni", "Nagpur", "Maharashtra", "440010"],
  ["Yash Agarwal", "Noida", "Uttar Pradesh", "201301"],
  ["Pooja Pillai", "Coimbatore", "Tamil Nadu", "641002"],
];

const STREETS = ["Linking Road, Bandra West", "80 Feet Road, Koramangala", "Hauz Khas Village", "TTK Road, Alwarpet", "SG Highway, Bodakdev", "Hitech City Road, Madhapur", "MG Road, Ravipuram", "FC Road, Shivajinagar", "Golf Course Road, Sector 54", "C-Scheme, Ashok Marg", "Kalidasa Road, Jayalakshmipuram", "Gomti Nagar Extension", "Ghod Dod Road, Athwa", "Kowdiar Avenue", "Sector 17-C", "Alkapuri Main Road", "Southern Avenue, Lake Market", "Salt Lake Sector V", "Vijay Nagar, Scheme 54", "Dharampeth Extension", "Sector 18, Atta Market", "Race Course Road, RS Puram"];

const REVIEW_BANK: Record<string, { t: string; c: string; r: number }[]> = {
  smartphones: [
    { t: "Best camera I've owned", c: "Low-light shots are genuinely impressive — indoor dinner photos come out sharp without the usual smudging. Battery easily lasts a full day with heavy Instagram and Maps use.", r: 5 },
    { t: "Fast, smooth, premium", c: "Everything opens instantly and the display is gorgeous. Build quality feels expensive. Only gripe is it gets a bit warm during long gaming sessions.", r: 4 },
    { t: "Worth the upgrade", c: "Upgraded from a three-year-old phone and the difference is night and day. Delivery from NOVA was quick and the box was sealed and genuine.", r: 5 },
    { t: "Great, but pricey", c: "Performance and camera are top notch. Wish the charger was included at this price, but the phone itself is excellent.", r: 4 },
    { t: "Solid daily driver", c: "Clean software, excellent haptics and the speakers are loud enough for calls in the car. Video stabilisation is superb.", r: 5 },
  ],
  laptops: [
    { t: "Silent and powerful", c: "Handles my Figma, VS Code and 40 Chrome tabs without breaking a sweat. Battery genuinely lasts a full workday.", r: 5 },
    { t: "Gorgeous display", c: "Colours are accurate out of the box — perfect for photo editing. Keyboard is comfortable for long writing sessions.", r: 5 },
    { t: "Excellent build", c: "Feels incredibly solid and premium. Fans kick in under heavy loads but it stays reasonably quiet.", r: 4 },
    { t: "Perfect for college", c: "Light enough to carry all day and the battery survives back-to-back lectures. Webcam could be better.", r: 4 },
  ],
  tablets: [
    { t: "Replaced my laptop for travel", c: "With the keyboard attached I do most of my email and docs on it. The screen is stunning for Netflix on flights.", r: 5 },
    { t: "Great for notes", c: "Handwriting with the stylus feels natural and palm rejection is flawless. Battery lasts through a full day of classes.", r: 5 },
    { t: "Beautiful but accessories are costly", c: "The tablet itself is superb. Budget extra for the pen and keyboard though.", r: 4 },
  ],
  audio: [
    { t: "Noise cancelling is unreal", c: "Used them on a Mumbai–Delhi flight and the engine noise just disappeared. Sound is warm with punchy bass, and they stay comfortable for hours.", r: 5 },
    { t: "Crisp sound, great calls", c: "Colleagues say my voice is clearer than on my laptop mic. Multipoint switching between phone and laptop works reliably.", r: 5 },
    { t: "Comfortable for long use", c: "I wear them for 6–7 hours a day while working and there's no ear fatigue. The app EQ lets you tune the sound nicely.", r: 4 },
    { t: "Battery life is excellent", c: "Charge once a week with daily commute use. Quick charge is handy when I forget.", r: 5 },
    { t: "Good, not perfect", c: "Sound and ANC are great. Touch controls occasionally register accidental taps when adjusting the fit.", r: 4 },
    { t: "Fit could be better", c: "Audio quality is excellent but I had to try the larger tips to get a good seal. Once fitted, ANC is strong.", r: 3 },
  ],
  wearables: [
    { t: "Accurate fitness tracking", c: "GPS distance matches my running app almost exactly and heart-rate readings are consistent with my chest strap.", r: 5 },
    { t: "Sleep tracking is insightful", c: "The sleep data has actually helped me fix my bedtime routine. Comfortable enough to wear overnight.", r: 5 },
    { t: "Battery could be longer", c: "Brilliant display and smooth software, but I charge it every day with workouts enabled.", r: 4 },
    { t: "Great for outdoor sports", c: "Took it trekking in Himachal — maps and altitude tracking were spot on. Built like a tank.", r: 5 },
  ],
  gaming: [
    { t: "Aim feels effortless", c: "So light it disappears in hand. Sensor is flawless and clicks are crisp. Noticeable improvement in my Valorant games.", r: 5 },
    { t: "Pro-level gear", c: "Wireless with zero perceptible lag. Build quality is excellent and the battery lasts a whole week of gaming.", r: 5 },
    { t: "Great mic, great sound", c: "Teammates said my mic is the clearest in the lobby. Footsteps are easy to pinpoint.", r: 5 },
    { t: "Solid but expensive", c: "Performance is superb, but it's hard to justify the price over the previous model. Still happy with it.", r: 4 },
  ],
  "desk-setup": [
    { t: "Transformed my workspace", c: "Typing feel is buttery and quiet — the gasket mount makes a real difference. Connecting to three devices is seamless.", r: 5 },
    { t: "Productivity boost", c: "The scroll wheel and gestures save me time every day. Battery lasts for weeks.", r: 5 },
    { t: "Sharp and colour accurate", c: "Text is razor sharp and the single-cable setup with my laptop is fantastic. Stand is sturdy and adjustable.", r: 5 },
    { t: "Compact and fast", c: "Charges my laptop and phone together at full speed. Tiny enough to carry in my pocket.", r: 4 },
  ],
  "smart-home": [
    { t: "Great sound for the size", c: "Fills my living room easily. Voice recognition works even with the TV on.", r: 5 },
    { t: "Easy setup", c: "Took five minutes to set up and the app alerts are fast and accurate. Night vision is clear.", r: 4 },
    { t: "Handy smart hub", c: "Controls my lights and plugs reliably. Wish the bass was a bit deeper.", r: 4 },
  ],
};

async function main() {
  console.log("Resetting data…");
  await db.$transaction([
    db.notification.deleteMany(), db.rewardTransaction.deleteMany(), db.rewardAccount.deleteMany(), db.couponUsage.deleteMany(),
    db.inventoryTransaction.deleteMany(), db.payment.deleteMany(), db.orderItem.deleteMany(), db.order.deleteMany(), db.review.deleteMany(),
    db.cartItem.deleteMany(), db.cart.deleteMany(), db.wishlistItem.deleteMany(), db.wishlist.deleteMany(), db.stockAlert.deleteMany(),
    db.address.deleteMany(), db.coupon.deleteMany(), db.productSpecification.deleteMany(), db.productImage.deleteMany(), db.product.deleteMany(),
    db.brand.deleteMany(), db.category.deleteMany(), db.session.deleteMany(), db.account.deleteMany(), db.authToken.deleteMany(), db.emailLog.deleteMany(), db.user.deleteMany(), db.newsletterSubscriber.deleteMany(),
  ]);

  // ── Catalog ──
  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({ data: { ...c, sortOrder: i, image: `/categories/${c.slug}.webp` } });
    cats.set(c.slug, row.id);
  }
  const brands = new Map<string, string>();
  for (const b of BRANDS) {
    const row = await db.brand.create({ data: { name: b.name, slug: slug(b.name), featured: b.featured, description: b.description } });
    brands.set(b.name, row.id);
  }

  type P = { id: string; name: string; sku: string; price: Prisma.Decimal; img: string; category: string; stockTarget: number; popularity: number; createdAt: Date; colors: string[] };
  const products: P[] = [];
  const flashEnds = new Date(Date.now() + 2 * 86400000 + 5 * 3600000);
  for (const [i, p] of PRODUCTS.entries()) {
    const price = new D(p.price);
    const mrp = p.mrp ? new D(p.mrp) : null;
    const disc = mrp ? mrp.minus(price).dividedBy(mrp).times(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_FLOOR).toNumber() : 0;
    const brandCode = p.brand.slice(0, 3).toUpperCase();
    const sku = `NV-${brandCode}-${String(1001 + i)}`;
    const createdAt = daysAgo(p.ageDays, 11);
    const row = await db.product.create({
      data: {
        name: p.name, slug: slug(p.name), tagline: p.tagline, description: p.description, price, compareAtPrice: mrp,
        costPrice: price.times(0.78).toDecimalPlaces(2), discountPercent: disc, sku, stock: 0, lowStockThreshold: 5,
        status: "PUBLISHED", featured: !!p.featured, trending: !!p.trending, isFlashDrop: !!p.flash, flashDropEndsAt: p.flash ? flashEnds : null,
        tags: p.tags, colors: p.colors, warranty: p.warranty, categoryId: cats.get(p.category)!, brandId: brands.get(p.brand)!, createdAt,
        images: {
          create: [1, 2, 3].map((n, pos) => ({ url: `/products/${p.img}-${n}.webp`, alt: n === 1 ? p.name : `${p.name} — ${n === 2 ? "detail" : "angle"} view`, provider: "local", storageKey: `products/${p.img}-${n}.webp`, position: pos })),
        },
        specifications: { create: p.specs.map(([group, key, value, filterable], pos) => ({ group, key, value, filterable: !!filterable, position: pos })) },
      },
    });
    products.push({ id: row.id, name: p.name, sku, price, img: p.img, category: p.category, stockTarget: p.stock, popularity: p.popularity, createdAt, colors: p.colors });
  }
  console.log(`  ${products.length} products`);

  // ── Users ──
  const adminHash = await bcrypt.hash("Admin@12345", 10);
  const custHash = await bcrypt.hash("Customer@123", 10);
  const admin = await db.user.create({ data: { name: "NOVA Admin", email: "admin@nova.dev", passwordHash: adminHash, role: "ADMIN", phone: "9876500000", createdAt: daysAgo(400), emailVerified: daysAgo(400), rewardAccount: { create: {} } } });
  const demo = await db.user.create({ data: { name: "Riya Shah", email: "customer@nova.dev", passwordHash: custHash, phone: "9824012345", createdAt: daysAgo(330), emailVerified: daysAgo(330), rewardAccount: { create: {} } } });
  const demoAddr = await db.address.create({ data: { userId: demo.id, label: "Home", fullName: "Riya Shah", phone: "9824012345", line1: "B-702, Sky Heights, Vesu Main Road", line2: "Near VR Mall", city: "Surat", state: "Gujarat", pincode: "395007", isDefault: true } });
  await db.address.create({ data: { userId: demo.id, label: "Work", fullName: "Riya Shah", phone: "9824012345", line1: "4th Floor, Titanium Square, Thaltej Cross Road", city: "Ahmedabad", state: "Gujarat", pincode: "380054" } });

  const users: { id: string; name: string; addr: Awaited<ReturnType<typeof db.address.create>>; createdAt: Date }[] = [{ id: demo.id, name: demo.name, addr: demoAddr, createdAt: demo.createdAt }];
  for (const [i, [name, city, state, pincode]] of CUSTOMERS.entries()) {
    const createdAt = daysAgo(int(5, 365));
    const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.in";
    const u = await db.user.create({ data: { name, email, passwordHash: custHash, phone: `98${String(20000000 + i * 137911).slice(0, 8)}`, createdAt, emailVerified: createdAt, rewardAccount: { create: {} } } });
    const addr = await db.address.create({ data: { userId: u.id, label: "Home", fullName: name, phone: `98${String(20000000 + i * 137911).slice(0, 8)}`, line1: `${int(1, 240)}, ${STREETS[i % STREETS.length]}`, city, state, pincode, isDefault: true, createdAt } });
    users.push({ id: u.id, name, addr, createdAt });
  }
  console.log(`  ${users.length + 1} users`);

  // ── Coupons ──
  const now = new Date();
  const coupons = {
    NOVA10: await db.coupon.create({ data: { code: "NOVA10", description: "10% off on orders above ₹5,000 (max ₹2,000)", type: "PERCENTAGE", value: new D(10), minOrderAmount: new D(5000), maxDiscount: new D(2000), perUserLimit: 3, startsAt: daysAgo(365), active: true } }),
    WELCOME500: await db.coupon.create({ data: { code: "WELCOME500", description: "₹500 off your first order above ₹10,000", type: "FIXED", value: new D(500), minOrderAmount: new D(10000), perUserLimit: 1, startsAt: daysAgo(365), active: true } }),
    FLASH15: await db.coupon.create({ data: { code: "FLASH15", description: "15% off flash drop — orders above ₹20,000 (max ₹5,000)", type: "PERCENTAGE", value: new D(15), minOrderAmount: new D(20000), maxDiscount: new D(5000), usageLimit: 200, perUserLimit: 1, startsAt: daysAgo(10), expiresAt: new Date(now.getTime() + 20 * 86400000), active: true } }),
    AUDIO2K: await db.coupon.create({ data: { code: "AUDIO2K", description: "₹2,000 off orders above ₹25,000", type: "FIXED", value: new D(2000), minOrderAmount: new D(25000), perUserLimit: 2, startsAt: daysAgo(60), active: true } }),
    DIWALI25: await db.coupon.create({ data: { code: "DIWALI25", description: "Festive sale — expired", type: "PERCENTAGE", value: new D(25), minOrderAmount: new D(15000), maxDiscount: new D(6000), usageLimit: 500, perUserLimit: 1, startsAt: daysAgo(340), expiresAt: daysAgo(320), active: true } }),
  };

  // ── Orders (12 months) ──
  const weighted: P[] = products.flatMap((p) => Array(p.popularity).fill(p));
  type Line = { p: P; qty: number; color: string };
  type SeedOrder = { user: (typeof users)[number]; at: Date; lines: Line[]; status: OrderStatus; method: PaymentMethod; delivery: "STANDARD" | "EXPRESS"; coupon?: keyof typeof coupons };
  const seedOrders: SeedOrder[] = [];
  const statusFor = (age: number): OrderStatus => {
    if (age > 12) return rand() < 0.07 ? "CANCELLED" : "DELIVERED";
    if (age > 6) return pick(["DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "SHIPPED", "CANCELLED"] as const);
    if (age > 2) return pick(["SHIPPED", "PACKED", "CONFIRMED", "DELIVERED"] as const);
    return pick(["CONFIRMED", "CONFIRMED", "PACKED", "PENDING"] as const);
  };
  const methods: PaymentMethod[] = ["UPI", "UPI", "UPI", "CARD", "CARD", "NET_BANKING", "COD"];

  const TOTAL = 150;
  for (let i = 0; i < TOTAL; i++) {
    // Skew toward recent months for a growth curve
    const age = Math.floor(Math.pow(rand(), 1.35) * 360);
    const at = daysAgo(age);
    const eligibleUsers = users.filter((u) => u.createdAt <= at);
    const user = eligibleUsers.length ? pick(eligibleUsers) : users[0];
    const n = rand() < 0.72 ? 1 : rand() < 0.8 ? 2 : 3;
    const lines: Line[] = [];
    for (let k = 0; k < n; k++) {
      const p = pick(weighted.filter((x) => x.createdAt <= at && !lines.some((l) => l.p.id === x.id)));
      if (!p) continue;
      lines.push({ p, qty: p.price.lessThan(20000) && rand() < 0.2 ? 2 : 1, color: pick(p.colors) });
    }
    if (!lines.length) continue;
    seedOrders.push({ user, at, lines, status: statusFor(age), method: pick(methods), delivery: rand() < 0.22 ? "EXPRESS" : "STANDARD" });
  }

  // Curated demo-customer history
  const find = (name: string) => products.find((p) => p.name === name)!;
  seedOrders.push(
    { user: users[0], at: daysAgo(120), lines: [{ p: find("Sony WH-1000XM6"), qty: 1, color: "Black" }], status: "DELIVERED", method: "UPI", delivery: "STANDARD", coupon: "NOVA10" },
    { user: users[0], at: daysAgo(64), lines: [{ p: find("Logitech MX Master 3S"), qty: 1, color: "Graphite" }, { p: find("Keychron Q1 Max"), qty: 1, color: "Carbon Black" }], status: "DELIVERED", method: "CARD", delivery: "EXPRESS" },
    { user: users[0], at: daysAgo(5), lines: [{ p: find("Nothing Ear"), qty: 1, color: "White" }], status: "SHIPPED", method: "UPI", delivery: "STANDARD" },
    { user: users[0], at: daysAgo(1), lines: [{ p: find("Anker Prime 100W GaN Charger"), qty: 1, color: "Black" }], status: "CONFIRMED", method: "COD", delivery: "STANDARD" },
  );
  seedOrders.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Initial purchase stock per product = target + all non-cancelled units sold
  const sold = new Map<string, number>();
  for (const o of seedOrders) if (o.status !== "CANCELLED") for (const l of o.lines) sold.set(l.p.id, (sold.get(l.p.id) ?? 0) + l.qty);
  const running = new Map<string, number>();
  for (const p of products) {
    const initial = p.stockTarget + (sold.get(p.id) ?? 0);
    running.set(p.id, initial);
    await db.inventoryTransaction.create({ data: { productId: p.id, change: initial, reason: "PURCHASE", note: "Opening stock — PO from distributor", stockAfter: initial, actorId: admin.id, createdAt: new Date(p.createdAt.getTime() - 86400000) } });
  }

  const usedNumbers = new Set<string>();
  const nextNumber = () => {
    let n: string;
    do n = `NVA-${int(10000, 99999)}`;
    while (usedNumbers.has(n));
    usedNumbers.add(n);
    return n;
  };
  const rewardBal = new Map<string, number>();
  const couponUsed = new Map<string, number>();
  const delivered: { userId: string; productId: string; at: Date; category: string }[] = [];
  let orderCount = 0;
  const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

  for (const o of seedOrders) {
    const orderNumber = nextNumber();
    const subtotal = o.lines.reduce((acc, l) => acc.plus(l.p.price.times(l.qty)), new D(0));
    let discount = new D(0);
    let couponKey = o.coupon;
    if (!couponKey && rand() < 0.18) couponKey = subtotal.greaterThanOrEqualTo(20000) && o.at > daysAgo(10) ? "FLASH15" : subtotal.greaterThanOrEqualTo(5000) ? "NOVA10" : undefined;
    if (couponKey) {
      const c = coupons[couponKey];
      if (subtotal.greaterThanOrEqualTo(c.minOrderAmount)) {
        discount = c.type === "PERCENTAGE" ? subtotal.times(c.value).dividedBy(100) : c.value;
        if (c.maxDiscount && discount.greaterThan(c.maxDiscount)) discount = c.maxDiscount;
        discount = discount.toDecimalPlaces(2);
      } else couponKey = undefined;
    }
    const shipping = o.delivery === "EXPRESS" ? new D(99) : new D(0);
    const taxable = subtotal.minus(discount);
    const tax = taxable.times(18).dividedBy(118).toDecimalPlaces(2);
    const total = taxable.plus(shipping);
    const cancelled = o.status === "CANCELLED";
    const reachedIdx = cancelled ? 1 : FLOW.indexOf(o.status);
    const t = (step: number) => (reachedIdx >= step ? new Date(o.at.getTime() + [0, 0.02, 0.6, 1.2, 3.1, 3.6][step] * 86400000) : null);
    const points = !cancelled && o.status !== "PENDING" ? total.dividedBy(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_FLOOR).toNumber() : 0;
    const addr = o.user.addr;
    const paymentStatus = cancelled ? (o.method === "COD" ? "FAILED" : "REFUNDED") : o.method === "COD" ? (o.status === "DELIVERED" ? "CAPTURED" : "PENDING") : o.status === "PENDING" ? "PENDING" : "CAPTURED";

    const order = await db.order.create({
      data: {
        orderNumber, userId: o.user.id, status: o.status, deliveryMethod: o.delivery,
        shipName: addr.fullName, shipPhone: addr.phone, shipLine1: addr.line1, shipLine2: addr.line2, shipCity: addr.city, shipState: addr.state, shipPincode: addr.pincode,
        subtotal, discountTotal: discount, shippingFee: shipping, taxTotal: tax, total, pointsEarned: points,
        couponId: couponKey ? coupons[couponKey].id : null, couponCode: couponKey ?? null,
        estimatedDelivery: new Date(o.at.getTime() + (o.delivery === "EXPRESS" ? 2 : 5) * 86400000),
        placedAt: o.at, createdAt: o.at, updatedAt: o.at,
        confirmedAt: t(1), packedAt: t(2), shippedAt: t(3), outForDeliveryAt: t(4), deliveredAt: t(5),
        cancelledAt: cancelled ? new Date(o.at.getTime() + 0.3 * 86400000) : null, cancelReason: cancelled ? pick(["Ordered by mistake", "Found a better price elsewhere", "Delivery date too late", "Changed my mind"]) : null,
        items: { create: o.lines.map((l) => ({ productId: l.p.id, name: l.p.name, sku: l.p.sku, image: `/products/${l.p.img}-1.webp`, color: l.color, unitPrice: l.p.price, quantity: l.qty, lineTotal: l.p.price.times(l.qty), createdAt: o.at })) },
        payments: {
          create: {
            provider: "mock", method: o.method, amount: total, status: paymentStatus,
            providerPaymentId: paymentStatus === "CAPTURED" || paymentStatus === "REFUNDED" ? `mock_pay_${orderNumber.slice(4)}${int(100, 999)}` : null,
            paidAt: paymentStatus === "CAPTURED" || paymentStatus === "REFUNDED" ? (o.method === "COD" ? t(5) : o.at) : null, createdAt: o.at,
          },
        },
      },
    });
    orderCount++;

    for (const l of o.lines) {
      const after = running.get(l.p.id)! - l.qty;
      running.set(l.p.id, after);
      await db.inventoryTransaction.create({ data: { productId: l.p.id, change: -l.qty, reason: "ORDER", note: `Order ${orderNumber}`, orderId: order.id, stockAfter: after, createdAt: o.at } });
      if (cancelled) {
        const back = after + l.qty;
        running.set(l.p.id, back);
        await db.inventoryTransaction.create({ data: { productId: l.p.id, change: l.qty, reason: "ORDER_CANCELLED", note: `Cancelled ${orderNumber}`, orderId: order.id, stockAfter: back, createdAt: new Date(o.at.getTime() + 0.3 * 86400000) } });
      } else {
        await db.product.update({ where: { id: l.p.id }, data: { soldCount: { increment: l.qty } } });
      }
      if (o.status === "DELIVERED") delivered.push({ userId: o.user.id, productId: l.p.id, at: t(5)!, category: l.p.category });
    }

    if (couponKey && !cancelled) {
      await db.couponUsage.create({ data: { couponId: coupons[couponKey].id, userId: o.user.id, orderId: order.id, amount: discount, createdAt: o.at } });
      couponUsed.set(couponKey, (couponUsed.get(couponKey) ?? 0) + 1);
    }

    if (points > 0) {
      const acc = await db.rewardAccount.findUniqueOrThrow({ where: { userId: o.user.id } });
      await db.rewardTransaction.create({ data: { accountId: acc.id, type: "EARNED", points, description: `Earned on ${orderNumber}`, orderId: order.id, createdAt: t(1) ?? o.at } });
      rewardBal.set(o.user.id, (rewardBal.get(o.user.id) ?? 0) + points);
    }

    // Notifications trail (recent orders only, to keep the feed meaningful)
    if (o.at > daysAgo(45)) {
      const link = `/account/orders/${orderNumber}`;
      const notes: { type: "ORDER_CONFIRMED" | "ORDER_SHIPPED" | "ORDER_DELIVERED" | "ORDER_CANCELLED"; title: string; body: string; at: Date | null }[] = [
        { type: "ORDER_CONFIRMED", title: `Order ${orderNumber} confirmed`, body: `Thanks for shopping with NOVA. You earned ${points} NOVA points.`, at: t(1) },
        { type: "ORDER_SHIPPED", title: `Order ${orderNumber} has shipped`, body: "Your package is on its way.", at: t(3) },
        { type: "ORDER_DELIVERED", title: `Order ${orderNumber} delivered`, body: "Enjoy your new gear! Share a review to help others.", at: t(5) },
      ];
      if (cancelled) notes.push({ type: "ORDER_CANCELLED", title: `Order ${orderNumber} cancelled`, body: o.method === "COD" ? "Your order has been cancelled." : "Your refund has been initiated and will reach your original payment method in 5–7 business days.", at: new Date(o.at.getTime() + 0.3 * 86400000) });
      for (const n of notes) if (n.at && n.at < new Date()) await db.notification.create({ data: { userId: o.user.id, type: n.type, title: n.title, body: n.body, link, createdAt: n.at, readAt: n.at < daysAgo(3) ? n.at : null } });
    }
  }
  // Reconcile final stock with ledger
  for (const p of products) await db.product.update({ where: { id: p.id }, data: { stock: running.get(p.id)! } });
  for (const [k, n] of couponUsed) await db.coupon.update({ where: { id: coupons[k as keyof typeof coupons].id }, data: { usedCount: n } });
  console.log(`  ${orderCount} orders`);

  // A few restock/adjustment ledger entries
  for (const p of products.filter((x) => x.stockTarget > 20).slice(0, 6)) {
    const cur = running.get(p.id)!;
    await db.inventoryTransaction.create({ data: { productId: p.id, change: -1, reason: "DAMAGED", note: "Damaged in transit — written off", stockAfter: cur - 1, actorId: admin.id, createdAt: daysAgo(int(10, 40)) } });
    await db.inventoryTransaction.create({ data: { productId: p.id, change: 1, reason: "RETURN", note: "Customer return — resellable", stockAfter: cur, actorId: admin.id, createdAt: daysAgo(int(2, 9)) } });
  }

  // ── Rewards: welcome bonus + some redemptions ──
  for (const u of users) {
    const acc = await db.rewardAccount.findUniqueOrThrow({ where: { userId: u.id } });
    await db.rewardTransaction.create({ data: { accountId: acc.id, type: "EARNED", points: 100, description: "Welcome bonus", createdAt: u.createdAt } });
    let bal = (rewardBal.get(u.id) ?? 0) + 100;
    let used = 0;
    if (bal > 800 && rand() < 0.5) {
      used = Math.floor(bal * 0.4);
      await db.rewardTransaction.create({ data: { accountId: acc.id, type: "REDEEMED", points: -used, description: "Redeemed at checkout", createdAt: daysAgo(int(3, 30)) } });
      bal -= used;
    }
    await db.rewardAccount.update({ where: { id: acc.id }, data: { balance: bal, lifetimeEarned: bal + used, lifetimeUsed: used } });
  }

  // ── Reviews (verified purchasers only) ──
  const reviewed = new Set<string>();
  let reviewCount = 0;
  for (const d of delivered) {
    const key = `${d.userId}:${d.productId}`;
    if (reviewed.has(key)) continue;
    if (d.userId === demo.id && reviewCount > 0 && rand() < 0.5) continue; // leave something for the demo user to review
    if (rand() > 0.72) continue;
    reviewed.add(key);
    const r = pick(REVIEW_BANK[d.category] ?? REVIEW_BANK.audio);
    await db.review.create({ data: { userId: d.userId, productId: d.productId, rating: r.r, title: r.t, comment: r.c, verifiedPurchase: true, status: "APPROVED", createdAt: new Date(d.at.getTime() + int(2, 12) * 86400000) } });
    reviewCount++;
  }
  // One pending-moderation example
  const pendingTarget = delivered.find((d) => !reviewed.has(`${d.userId}:${d.productId}`) && d.userId !== demo.id);
  if (pendingTarget) {
    await db.review.create({ data: { userId: pendingTarget.userId, productId: pendingTarget.productId, rating: 2, title: "Box arrived dented", comment: "Product works fine but the outer box was dented on arrival. Packaging could be sturdier for such an expensive item.", status: "PENDING", verifiedPurchase: true } });
    reviewCount++;
  }
  // Recompute rating aggregates from approved reviews
  const aggs = await db.review.groupBy({ by: ["productId"], where: { status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  for (const a of aggs) await db.product.update({ where: { id: a.productId }, data: { ratingAvg: (a._avg.rating ?? 0).toFixed(2), ratingCount: a._count._all } });
  console.log(`  ${reviewCount} reviews`);

  // ── Demo customer extras: wishlist, stock alert, promos ──
  const wl = await db.wishlist.create({ data: { userId: demo.id } });
  for (const name of ["AirPods Max", "Apple Watch Ultra 3", "Samsung Galaxy S25 Ultra", "PlayStation 5 Pro"]) {
    const p = find(name);
    await db.wishlistItem.create({ data: { wishlistId: wl.id, productId: p.id, priceAtAdd: name === "Samsung Galaxy S25 Ultra" ? new D(129999) : p.price } });
  }
  await db.stockAlert.create({ data: { userId: demo.id, productId: find("AirPods Max").id } });
  await db.notification.create({ data: { userId: demo.id, type: "PRICE_DROP", title: "Price drop: Samsung Galaxy S25 Ultra", body: "Now ₹1,19,999 (was ₹1,29,999). It's on your wishlist.", link: "/product/samsung-galaxy-s25-ultra", createdAt: daysAgo(0, 8) } });
  await db.notification.create({ data: { userId: demo.id, type: "BACK_IN_STOCK", title: "Sony WF-1000XM5 is back in stock", body: "Only a few units left — grab yours before it sells out.", link: "/product/sony-wf-1000xm5", createdAt: daysAgo(2) } });
  for (const u of users) {
    await db.notification.create({ data: { userId: u.id, type: "PROMOTIONAL", title: "Flash Drop is live", body: "Up to 30% off Sony, Bose, Dell and Samsung for 48 hours. Stack with code FLASH15.", link: "/shop?discount=10", createdAt: daysAgo(0, 7) } });
  }
  await db.newsletterSubscriber.createMany({ data: users.slice(0, 12).map((u, i) => ({ email: `subscriber${i + 1}@example.in` })) });

  console.log("Seed complete.\n  Admin:    admin@nova.dev / Admin@12345\n  Customer: customer@nova.dev / Customer@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
