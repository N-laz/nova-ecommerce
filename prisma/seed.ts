/* NOVA seed — products only + admin user */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRANDS, CATEGORIES, PRODUCTS } from "./data/products";

const db = new PrismaClient();
const D = Prisma.Decimal;

const slug = (x: string) =>
  x
    .toLowerCase()
    .replace(/["″]/g, "")
    .replace(/ē/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const daysAgo = (d: number, h = 11) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t;
};

async function main() {
  console.log("Resetting data…");

  // Wipe everything (in FK-safe order)
  await db.$transaction([
    db.notification.deleteMany(),
    db.rewardTransaction.deleteMany(),
    db.rewardAccount.deleteMany(),
    db.couponUsage.deleteMany(),
    db.inventoryTransaction.deleteMany(),
    db.payment.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.review.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.wishlistItem.deleteMany(),
    db.wishlist.deleteMany(),
    db.stockAlert.deleteMany(),
    db.address.deleteMany(),
    db.coupon.deleteMany(),
    db.productSpecification.deleteMany(),
    db.productImage.deleteMany(),
    db.product.deleteMany(),
    db.brand.deleteMany(),
    db.category.deleteMany(),
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.authToken.deleteMany(),
    db.emailLog.deleteMany(),
    db.user.deleteMany(),
    db.newsletterSubscriber.deleteMany(),
  ]);

  // ── Admin user ──
  const adminHash = await bcrypt.hash("Admin@12345", 10);
  await db.user.create({
    data: {
      name: "Noman Kazi",
      email: "kazinomanimtiyaz7656@gmail.com",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: new Date(),
      rewardAccount: { create: {} },
    },
  });
  console.log("  ✓ Admin user: kazinomanimtiyaz7656@gmail.com");

  // ── Categories ──
  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({
      data: { ...c, sortOrder: i, image: `/categories/${c.slug}.webp` },
    });
    cats.set(c.slug, row.id);
  }

  // ── Brands ──
  const brands = new Map<string, string>();
  for (const b of BRANDS) {
    const row = await db.brand.create({
      data: {
        name: b.name,
        slug: slug(b.name),
        featured: b.featured,
        description: b.description,
      },
    });
    brands.set(b.name, row.id);
  }

  // ── Products ──
  for (const [i, p] of PRODUCTS.entries()) {
    const price = new D(p.price);
    const mrp = p.mrp ? new D(p.mrp) : null;
    const disc = mrp
      ? mrp
          .minus(price)
          .dividedBy(mrp)
          .times(100)
          .toDecimalPlaces(0, Prisma.Decimal.ROUND_FLOOR)
          .toNumber()
      : 0;
    const brandCode = p.brand.slice(0, 3).toUpperCase();
    const sku = `NV-${brandCode}-${String(1001 + i)}`;
    const createdAt = daysAgo(p.ageDays, 11);

    await db.product.create({
      data: {
        name: p.name,
        slug: slug(p.name),
        tagline: p.tagline,
        description: p.description,
        price,
        compareAtPrice: mrp,
        costPrice: price.times(0.78).toDecimalPlaces(2),
        discountPercent: disc,
        sku,
        stock: p.stock,
        lowStockThreshold: 5,
        status: "PUBLISHED",
        featured: !!p.featured,
        trending: !!p.trending,
        tags: p.tags,
        colors: p.colors,
        warranty: p.warranty,
        categoryId: cats.get(p.category)!,
        brandId: brands.get(p.brand)!,
        createdAt,
        images: {
          create: [1, 2, 3].map((n, pos) => ({
            url: `/products/${p.img}-${n}.webp`,
            alt:
              n === 1
                ? p.name
                : `${p.name} — ${n === 2 ? "detail" : "angle"} view`,
            provider: "local",
            storageKey: `products/${p.img}-${n}.webp`,
            position: pos,
          })),
        },
        specifications: {
          create: p.specs.map(([group, key, value, filterable], pos) => ({
            group,
            key,
            value,
            filterable: !!filterable,
            position: pos,
          })),
        },
      },
    });
  }

  console.log(`  ✓ ${PRODUCTS.length} products`);
  console.log("");
  console.log("Seed complete.");
  console.log("  Admin email:    kazinomanimtiyaz7656@gmail.com");
  console.log("  Admin password: Admin@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
