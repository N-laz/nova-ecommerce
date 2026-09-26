import { z } from "zod";

const money = z.coerce.number({ message: "Enter an amount." }).nonnegative("Must be positive.").max(99_99_999, "Amount too large.").multipleOf(0.01, "Max 2 decimals.");

export const specSchema = z.object({
  group: z.string().trim().min(1).max(40).default("General"),
  key: z.string().trim().min(1, "Spec name required.").max(60),
  value: z.string().trim().min(1, "Spec value required.").max(200),
  filterable: z.boolean().default(false),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters.").max(120),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and dashes.").max(90),
    tagline: z.string().trim().max(140).optional().or(z.literal("")),
    description: z.string().trim().min(20, "Description should be at least 20 characters.").max(5000),
    price: money,
    compareAtPrice: money.optional().nullable(),
    sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/, "SKU: 3–40 letters, numbers or dashes."),
    categoryId: z.string().min(1, "Select a category."),
    brandId: z.string().min(1, "Select a brand."),
    stock: z.coerce.number().int().min(0, "Stock can't be negative.").max(1_000_000),
    lowStockThreshold: z.coerce.number().int().min(0).max(10_000).default(5),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    featured: z.boolean(),
    trending: z.boolean(),
    isFlashDrop: z.boolean().default(false),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20),
    colors: z.array(z.string().trim().min(1).max(30)).max(10),
    warranty: z.string().trim().max(120).optional().or(z.literal("")),
    images: z.array(z.object({ url: z.string().min(1), alt: z.string().max(160).optional().nullable(), storageKey: z.string().optional().nullable(), provider: z.string().default("local") })).max(10),
    specifications: z.array(specSchema).max(60),
  })
  .refine((v) => v.compareAtPrice == null || v.compareAtPrice === 0 || v.compareAtPrice > v.price, {
    message: "Compare-at price must be higher than the price.",
    path: ["compareAtPrice"],
  });
export type ProductInput = z.infer<typeof productSchema>;

export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  mode: z.enum(["add", "remove", "set"]),
  quantity: z.coerce.number().int().min(0, "Quantity can't be negative.").max(1_000_000),
  reason: z.enum(["PURCHASE", "RESTOCK", "ADJUSTMENT", "DAMAGED", "RETURN"]),
  note: z.string().trim().max(200).optional(),
});

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Code: 3–20 letters or numbers."),
    description: z.string().trim().max(160).optional().or(z.literal("")),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.coerce.number().positive("Value must be greater than 0."),
    minOrderAmount: z.coerce.number().min(0).default(0),
    maxDiscount: z.coerce.number().positive().optional().nullable(),
    usageLimit: z.coerce.number().int().positive().optional().nullable(),
    perUserLimit: z.coerce.number().int().min(1).default(1),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date().optional().nullable(),
    active: z.boolean(),
  })
  .refine((v) => v.type !== "PERCENTAGE" || v.value <= 90, { message: "Percentage can't exceed 90%.", path: ["value"] })
  .refine((v) => !v.expiresAt || v.expiresAt > v.startsAt, { message: "Expiry must be after the start date.", path: ["expiresAt"] });
export type CouponInput = z.infer<typeof couponSchema>;

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  title: z.string().trim().min(3, "Add a short title.").max(100),
  comment: z.string().trim().min(10, "Tell us a bit more (10+ characters).").max(2000),
});

export const shopQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  inStock: z.enum(["1"]).optional(),
  discount: z.coerce.number().int().min(0).max(90).optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "rating", "popular"]).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  tag: z.string().max(40).optional(),
});
