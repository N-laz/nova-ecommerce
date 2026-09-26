import "server-only";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { ProductCardDTO } from "@/types";

export const CATALOG_TAG = "catalog";
const NEW_DAYS = 45;

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  discountPercent: true,
  ratingAvg: true,
  ratingCount: true,
  stock: true,
  lowStockThreshold: true,
  featured: true,
  trending: true,
  colors: true,
  createdAt: true,
  brand: { select: { name: true } },
  category: { select: { name: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export function toCard(p: CardRow): ProductCardDTO {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand.name,
    category: p.category.name,
    image: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? p.name,
    price: p.price.toFixed(2),
    compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toFixed(2) : null,
    discountPercent: p.discountPercent,
    ratingAvg: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    featured: p.featured,
    trending: p.trending,
    isNew: Date.now() - p.createdAt.getTime() < NEW_DAYS * 86_400_000,
    colors: p.colors,
  };
}

const published = { status: "PUBLISHED" } as const;

export const getCategories = unstable_cache(
  async () =>
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, description: true, image: true, _count: { select: { products: { where: published } } } },
    }),
  ["categories"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

export const getBrands = unstable_cache(
  async () =>
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, featured: true, description: true, _count: { select: { products: { where: published } } } },
    }),
  ["brands"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

export const getHomeSections = unstable_cache(
  async () => {
    const [trending, bestSellers, newArrivals, flash] = await Promise.all([
      db.product.findMany({ where: { ...published, trending: true }, select: productCardSelect, orderBy: { soldCount: "desc" }, take: 8 }),
      db.product.findMany({ where: published, select: productCardSelect, orderBy: [{ soldCount: "desc" }, { ratingAvg: "desc" }], take: 8 }),
      db.product.findMany({ where: published, select: productCardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
      db.product.findMany({
        where: { ...published, isFlashDrop: true, OR: [{ flashDropEndsAt: null }, { flashDropEndsAt: { gt: new Date() } }] },
        select: { ...productCardSelect, flashDropEndsAt: true, tagline: true },
        orderBy: { discountPercent: "desc" },
        take: 4,
      }),
    ]);
    return {
      trending: trending.map(toCard),
      bestSellers: bestSellers.map(toCard),
      newArrivals: newArrivals.map(toCard),
      flash: flash.map((p) => ({ ...toCard(p), tagline: p.tagline, endsAt: p.flashDropEndsAt?.toISOString() ?? null })),
    };
  },
  ["home-sections"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);

export const getHomeReviews = unstable_cache(
  async () => {
    const rows = await db.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, rating: true, title: true, comment: true, createdAt: true, user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
    });
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  },
  ["home-reviews"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

// ─────────────────────────── Shop query ───────────────────────────

export type ShopParams = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  rating?: number;
  inStock?: "1";
  discount?: number;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "rating" | "popular";
  page?: number;
  tag?: string;
  specs?: Record<string, string[]>;
};

export const PAGE_SIZE = 12;

function list(v?: string) {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20) : [];
}

export function buildWhere(p: ShopParams, opts: { skipSpecs?: boolean } = {}): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: "PUBLISHED" }];
  if (p.q) {
    const terms = p.q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const t of terms) {
      and.push({
        OR: [
          { name: { contains: t, mode: "insensitive" } },
          { tags: { has: t.toLowerCase() } },
          { brand: { name: { contains: t, mode: "insensitive" } } },
          { category: { name: { contains: t, mode: "insensitive" } } },
          { tagline: { contains: t, mode: "insensitive" } },
        ],
      });
    }
  }
  const cats = list(p.category);
  if (cats.length) and.push({ category: { slug: { in: cats } } });
  const brands = list(p.brand);
  if (brands.length) and.push({ brand: { slug: { in: brands } } });
  if (p.min !== undefined || p.max !== undefined) {
    and.push({ price: { ...(p.min !== undefined ? { gte: p.min } : {}), ...(p.max !== undefined && p.max > 0 ? { lte: p.max } : {}) } });
  }
  if (p.rating) and.push({ ratingAvg: { gte: p.rating } });
  if (p.inStock) and.push({ stock: { gt: 0 } });
  if (p.discount) and.push({ discountPercent: { gte: p.discount } });
  if (p.tag) and.push({ tags: { has: p.tag } });
  if (!opts.skipSpecs && p.specs) {
    for (const [key, values] of Object.entries(p.specs)) {
      if (values.length) and.push({ specifications: { some: { key, value: { in: values } } } });
    }
  }
  return { AND: and };
}

function orderBy(sort: ShopParams["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "popular":
      return [{ soldCount: "desc" }];
    default:
      return [{ featured: "desc" }, { trending: "desc" }, { soldCount: "desc" }];
  }
}

export async function searchProducts(p: ShopParams) {
  const where = buildWhere(p);
  const page = p.page ?? 1;
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, select: productCardSelect, orderBy: [...orderBy(p.sort), { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), products: rows.map(toCard) };
}

/** Facets for filterable specs, scoped to the current non-spec filters. */
export async function getSpecFacets(p: ShopParams) {
  const where = buildWhere(p, { skipSpecs: true });
  const rows = await db.productSpecification.groupBy({
    by: ["key", "value"],
    where: { filterable: true, product: where },
    _count: { _all: true },
    orderBy: [{ key: "asc" }, { value: "asc" }],
  });
  const map = new Map<string, { value: string; count: number }[]>();
  for (const r of rows) {
    if (!map.has(r.key)) map.set(r.key, []);
    map.get(r.key)!.push({ value: r.value, count: r._count._all });
  }
  return [...map.entries()].filter(([, v]) => v.length > 1).map(([key, values]) => ({ key, values })).slice(0, 8);
}

export const getPriceBounds = unstable_cache(
  async () => {
    const agg = await db.product.aggregate({ where: published, _min: { price: true }, _max: { price: true } });
    return { min: Math.floor(Number(agg._min.price ?? 0)), max: Math.ceil(Number(agg._max.price ?? 0)) };
  },
  ["price-bounds"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

// ─────────────────────────── Product detail ───────────────────────────

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true, id: true } },
      images: { orderBy: { position: "asc" } },
      specifications: { orderBy: [{ position: "asc" }] },
    },
  });
}

export async function getRelatedProducts(productId: string, categoryId: string, brandName: string) {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED", id: { not: productId }, OR: [{ categoryId }, { brand: { name: brandName } }] },
    select: productCardSelect,
    orderBy: [{ categoryId: "asc" }, { soldCount: "desc" }],
    take: 12,
  });
  // Prefer same category first
  return rows.map(toCard).sort((a, b) => Number(b.category === rows[0]?.category.name) - Number(a.category === rows[0]?.category.name)).slice(0, 8);
}

export async function getCardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, select: productCardSelect });
  const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductCardDTO[];
}

export async function getReviewsForProduct(productId: string, take = 20) {
  const [reviews, dist] = await Promise.all([
    db.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, rating: true, title: true, comment: true, verifiedPurchase: true, createdAt: true, user: { select: { name: true } } },
    }),
    db.review.groupBy({ by: ["rating"], where: { productId, status: "APPROVED" }, _count: { _all: true } }),
  ]);
  const distribution = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: dist.find((d) => d.rating === r)?._count._all ?? 0 }));
  return { reviews, distribution };
}

// ─────────────────────────── Live search ───────────────────────────

export async function liveSearch(q: string) {
  const term = q.trim();
  if (term.length < 2) return { products: [], categories: [], brands: [] };
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({
      where: buildWhere({ q: term }),
      select: { id: true, slug: true, name: true, price: true, compareAtPrice: true, brand: { select: { name: true } }, images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } },
      orderBy: [{ soldCount: "desc" }],
      take: 6,
    }),
    db.category.findMany({ where: { name: { contains: term, mode: "insensitive" } }, select: { name: true, slug: true }, take: 4 }),
    db.brand.findMany({ where: { name: { contains: term, mode: "insensitive" } }, select: { name: true, slug: true }, take: 4 }),
  ]);
  return {
    products: products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand.name, price: p.price.toFixed(2), compareAtPrice: p.compareAtPrice?.toFixed(2) ?? null, image: p.images[0]?.url ?? null })),
    categories,
    brands,
  };
}
