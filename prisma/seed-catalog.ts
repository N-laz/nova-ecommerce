/* NOVA — catalog-only seed. Products, categories, brands. NO users, orders, or reviews. */
import { PrismaClient, Prisma } from "@prisma/client";
import { BRANDS, CATEGORIES, PRODUCTS } from "./data/products";

const db = new PrismaClient();
const D = Prisma.Decimal;

const slug = (x: string) =>
  x.toLowerCase().replace(/["″]/g, "").replace(/ē/g, "e").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  console.log("🌱 Seeding catalog only (no users, no orders)...");

  // Clear catalog tables only — does NOT touch users, orders, reviews
  await db.productSpecification.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();

  // Categories
  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({
      data: { ...c, sortOrder: i, image: `/categories/${c.slug}.webp` },
    });
    cats.set(c.slug, row.id);
  }
  console.log(`  ✅ ${CATEGORIES.length} categories`);

  // Brands
  const brands = new Map<string, string>();
  for (const b of BRANDS) {
    const row = await db.brand.create({
      data: {
        name: b.name, slug: slug(b.name),
        featured: b.featured, description: b.description,
      },
    });
    brands.set(b.name, row.id);
  }
  console.log(`  ✅ ${BRANDS.length} brands`);

  // Products
  const flashEnds = new Date(Date.now() + 2 * 86400000 + 5 * 3600000);
  let count = 0;
  for (const [i, p] of PRODUCTS.entries()) {
    const price = new D(p.price);
    const mrp = p.mrp ? new D(p.mrp) : null;
    const disc = mrp
      ? mrp.minus(price).dividedBy(mrp).times(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_FLOOR).toNumber()
      : 0;
    const brandCode = p.brand.slice(0, 3).toUpperCase();
    const sku = `NV-${brandCode}-${String(1001 + i)}`;

    await db.product.create({
      data: {
        name: p.name, slug: slug(p.name), tagline: p.tagline, description: p.description,
        price, compareAtPrice: mrp, costPrice: price.times(0.78).toDecimalPlaces(2),
        discountPercent: disc, sku, stock: p.stock, lowStockThreshold: 5,
        status: "PUBLISHED",
        featured: !!p.featured, trending: !!p.trending,
        isFlashDrop: !!p.flash, flashDropEndsAt: p.flash ? flashEnds : null,
        tags: p.tags, colors: p.colors, warranty: p.warranty,
        categoryId: cats.get(p.category)!,
        brandId: brands.get(p.brand)!,
        images: {
          create: [1, 2, 3].map((n, pos) => ({
            url: `/products/${p.img}-${n}.webp`,
            alt: n === 1 ? p.name : `${p.name} — ${n === 2 ? "detail" : "angle"} view`,
            provider: "local",
            storageKey: `products/${p.img}-${n}.webp`,
            position: pos,
          })),
        },
        specifications: {
          create: p.specs.map(([group, key, value, filterable], pos) => ({
            group, key, value,
            filterable: !!filterable, position: pos,
          })),
        },
      },
    });
    count++;
  }
  console.log(`  ✅ ${count} products`);
  console.log("\n✨ Catalog seed complete! Users, orders, reviews untouched.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
