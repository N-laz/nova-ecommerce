"use server";

import { dispatch } from "@/lib/email";
import { emailPriceDrop, emailPromotion } from "@/lib/services/email-events";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { action, AppError, type ActionResult } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guards";
import { couponSchema, productSchema, stockAdjustSchema } from "@/lib/validation/catalog";
import { CATALOG_TAG } from "@/lib/services/catalog";
import { adjustStock, announceBackInStock, changeStock } from "@/lib/services/inventory";
import { advanceOrderStatus, cancelOrderInternal } from "@/lib/services/order";
import { moderateReview } from "@/lib/services/review";
import { notifyMany } from "@/lib/services/notification";
import { discountPercent } from "@/lib/money";
import { getStorage } from "@/lib/storage";
import { formatINR } from "@/lib/format";

function refreshCatalog() {
  revalidateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

// ─────────────────────────── Products ───────────────────────────

export async function saveProductAction(input: unknown, productId?: string): Promise<ActionResult<{ id: string; slug: string }>> {
  return action(
    "admin.product.save",
    async () => {
      const admin = await requireAdmin();
      const data = productSchema.parse(input);
      const price = new Prisma.Decimal(data.price);
      const compareAt = data.compareAtPrice ? new Prisma.Decimal(data.compareAtPrice) : null;
      const base = {
        name: data.name,
        slug: data.slug,
        tagline: data.tagline || null,
        description: data.description,
        price,
        compareAtPrice: compareAt,
        discountPercent: discountPercent(price, compareAt),
        sku: data.sku,
        categoryId: data.categoryId,
        brandId: data.brandId,
        lowStockThreshold: data.lowStockThreshold,
        status: data.status,
        featured: data.featured,
        trending: data.trending,
        isFlashDrop: data.isFlashDrop,
        tags: [...new Set(data.tags)],
        colors: [...new Set(data.colors)],
        warranty: data.warranty || null,
      };
      const images = data.images.map((img, i) => ({ url: img.url, alt: img.alt || data.name, storageKey: img.storageKey ?? null, provider: img.provider, position: i }));
      const specs = data.specifications.map((s, i) => ({ ...s, position: i }));
      const keys = specs.map((s) => s.key.toLowerCase());
      if (new Set(keys).size !== keys.length) throw new AppError("Each specification name must be unique.");

      if (!productId) {
        const created = await db.$transaction(async (tx) => {
          const p = await tx.product.create({ data: { ...base, stock: 0, images: { create: images }, specifications: { create: specs } } });
          if (data.stock > 0) await changeStock(tx, { productId: p.id, change: data.stock, reason: "PURCHASE", note: "Initial stock", actorId: admin.id });
          return p;
        });
        refreshCatalog();
        return { id: created.id, slug: created.slug };
      }

      const before = await db.product.findUnique({ where: { id: productId }, select: { price: true, stock: true, name: true, slug: true, status: true } });
      if (!before) throw new AppError("Product not found.", "NOT_FOUND", 404);
      const updated = await db.$transaction(async (tx) => {
        const p = await tx.product.update({ where: { id: productId }, data: base });
        await tx.productImage.deleteMany({ where: { productId } });
        if (images.length) await tx.productImage.createMany({ data: images.map((i) => ({ ...i, productId })) });
        await tx.productSpecification.deleteMany({ where: { productId } });
        if (specs.length) await tx.productSpecification.createMany({ data: specs.map((s) => ({ ...s, productId })) });
        const diff = data.stock - before.stock;
        if (diff !== 0) await changeStock(tx, { productId, change: diff, reason: "ADJUSTMENT", note: "Edited in product form", actorId: admin.id });
        return p;
      });

      // Customer notifications driven by real changes
      if (updated.status === "PUBLISHED" && price.lessThan(before.price)) {
        const wishers = await db.wishlistItem.findMany({ where: { productId }, select: { wishlist: { select: { userId: true } } } });
        const was = before.price.toFixed(2), now = price.toFixed(2);
        dispatch(() => emailPriceDrop(productId, wishers.map((w) => w.wishlist.userId), was, now));
        await notifyMany(
          wishers.map((w) => w.wishlist.userId),
          "PRICE_DROP",
          `Price drop: ${updated.name}`,
          `Now ${formatINR(price.toFixed(2))} (was ${formatINR(before.price.toFixed(2))}).`,
          `/product/${updated.slug}`,
        );
      }
      if (before.stock <= 0 && data.stock > 0) await announceBackInStock(productId);
      refreshCatalog();
      return { id: updated.id, slug: updated.slug };
    },
    productId ? "Product updated" : "Product created",
  );
}

export async function setProductFlagAction(productId: string, flag: "status" | "featured" | "trending", value: string | boolean): Promise<ActionResult<null>> {
  return action(
    "admin.product.flag",
    async () => {
      await requireAdmin();
      const data =
        flag === "status"
          ? { status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(value) }
          : flag === "featured"
            ? { featured: z.boolean().parse(value) }
            : { trending: z.boolean().parse(value) };
      await db.product.update({ where: { id: productId }, data });
      refreshCatalog();
      revalidatePath("/admin/products");
      return null;
    },
    "Product updated",
  );
}

export async function deleteProductAction(productId: string): Promise<ActionResult<{ archived: boolean }>> {
  return action("admin.product.delete", async () => {
    await requireAdmin();
    const orders = await db.orderItem.count({ where: { productId } });
    if (orders > 0) {
      // Preserve order history: archive instead of hard delete.
      await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
      refreshCatalog();
      return { archived: true };
    }
    await db.product.delete({ where: { id: productId } });
    refreshCatalog();
    return { archived: false };
  });
}

export async function uploadImagesAction(formData: FormData): Promise<ActionResult<{ url: string; storageKey: string; provider: string }[]>> {
  return action("admin.upload", async () => {
    await requireAdmin();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new AppError("Choose at least one image.");
    if (files.length > 10) throw new AppError("Upload up to 10 images at a time.");
    const storage = getStorage();
    const out = [];
    for (const f of files) out.push(await storage.upload(f, "products"));
    return out;
  });
}

// ─────────────────────────── Inventory ───────────────────────────

export async function adjustStockAction(input: unknown): Promise<ActionResult<{ stock: number }>> {
  return action(
    "admin.inventory.adjust",
    async () => {
      const admin = await requireAdmin();
      const data = stockAdjustSchema.parse(input);
      if (data.mode !== "set" && data.quantity === 0) throw new AppError("Enter a quantity greater than 0.");
      const stock = await adjustStock({ ...data, actorId: admin.id });
      revalidatePath("/admin/inventory");
      return { stock };
    },
    "Stock updated",
  );
}

// ─────────────────────────── Orders ───────────────────────────

export async function updateOrderStatusAction(orderId: string, status: string): Promise<ActionResult<null>> {
  return action(
    "admin.order.status",
    async () => {
      await requireAdmin();
      const next = z.enum(["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]).parse(status);
      await advanceOrderStatus(orderId, next);
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderId}`);
      return null;
    },
    "Order status updated",
  );
}

export async function adminCancelOrderAction(orderId: string, reason: string): Promise<ActionResult<null>> {
  return action(
    "admin.order.cancel",
    async () => {
      await requireAdmin();
      await cancelOrderInternal(orderId, { reason: z.string().trim().min(3, "Add a reason.").max(200).parse(reason), byAdmin: true });
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderId}`);
      return null;
    },
    "Order cancelled and restocked",
  );
}

// ─────────────────────────── Coupons ───────────────────────────

export async function saveCouponAction(input: unknown, couponId?: string): Promise<ActionResult<null>> {
  return action(
    "admin.coupon.save",
    async () => {
      await requireAdmin();
      const d = couponSchema.parse(input);
      const data = {
        code: d.code,
        description: d.description || null,
        type: d.type,
        value: new Prisma.Decimal(d.value),
        minOrderAmount: new Prisma.Decimal(d.minOrderAmount),
        maxDiscount: d.maxDiscount ? new Prisma.Decimal(d.maxDiscount) : null,
        usageLimit: d.usageLimit ?? null,
        perUserLimit: d.perUserLimit,
        startsAt: d.startsAt,
        expiresAt: d.expiresAt ?? null,
        active: d.active,
      };
      if (couponId) await db.coupon.update({ where: { id: couponId }, data });
      else await db.coupon.create({ data });
      revalidatePath("/admin/coupons");
      return null;
    },
    couponId ? "Coupon updated" : "Coupon created",
  );
}

export async function toggleCouponAction(couponId: string, active: boolean): Promise<ActionResult<null>> {
  return action("admin.coupon.toggle", async () => {
    await requireAdmin();
    await db.coupon.update({ where: { id: couponId }, data: { active } });
    revalidatePath("/admin/coupons");
    return null;
  }, active ? "Coupon activated" : "Coupon deactivated");
}

export async function deleteCouponAction(couponId: string): Promise<ActionResult<null>> {
  return action("admin.coupon.delete", async () => {
    await requireAdmin();
    const used = await db.couponUsage.count({ where: { couponId } });
    if (used > 0) throw new AppError("This coupon has been used on orders. Deactivate it instead to keep order history intact.");
    await db.coupon.delete({ where: { id: couponId } });
    revalidatePath("/admin/coupons");
    return null;
  }, "Coupon deleted");
}

// ─────────────────────────── Reviews & customers ───────────────────────────

export async function moderateReviewAction(reviewId: string, status: string): Promise<ActionResult<null>> {
  return action("admin.review.moderate", async () => {
    await requireAdmin();
    await moderateReview(reviewId, z.enum(["APPROVED", "HIDDEN", "DELETE"]).parse(status));
    revalidatePath("/admin/reviews");
    return null;
  }, "Review updated");
}

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult<null>> {
  return action("admin.user.role", async () => {
    const admin = await requireAdmin();
    const r = z.enum(["CUSTOMER", "ADMIN"]).parse(role);
    if (userId === admin.id && r !== "ADMIN") throw new AppError("You can't remove your own admin access.");
    await db.user.update({ where: { id: userId }, data: { role: r } });
    if (r === "CUSTOMER") await db.session.deleteMany({ where: { userId } });
    revalidatePath("/admin/customers");
    return null;
  }, "Role updated");
}

export async function broadcastPromoAction(input: unknown): Promise<ActionResult<{ sent: number }>> {
  return action("admin.broadcast", async () => {
    await requireAdmin();
    const d = z
      .object({ title: z.string().trim().min(3, "Add a title.").max(80), body: z.string().trim().min(5, "Add a message.").max(240), link: z.string().trim().startsWith("/", "Link must be a site path like /shop").max(200).optional().or(z.literal("")), email: z.boolean().optional() })
      .parse(input);
    const users = await db.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true } });
    const sent = await notifyMany(users.map((u) => u.id), "PROMOTIONAL", d.title, d.body, d.link || undefined);
    if (d.email) dispatch(() => emailPromotion(users.map((u) => u.id), d.title, d.body, d.link || null));
    revalidatePath("/admin/notifications");
    return { sent };
  });
}

// ─────────────────────────── Email log ───────────────────────────

/** Templates whose logged copy has its secret link redacted — they can't be re-sent from the log. */
const SECRET_TEMPLATES = new Set(["security.password_reset", "account.verify_email"]);

export async function sendTestEmailAction(): Promise<ActionResult<{ status: string }>> {
  return action("admin.testEmail", async () => {
    const admin = await requireAdmin();
    const { sendEmail } = await import("@/lib/email");
    const { getEmailProvider } = await import("@/lib/email/providers");
    const { testEmailTemplate } = await import("@/lib/email/templates");
    const r = await sendEmail({ to: admin.email, userId: admin.id, template: "admin.test", rendered: testEmailTemplate(getEmailProvider().name) });
    revalidatePath("/admin/emails");
    if (!r.ok) throw new AppError("The provider rejected the test email. Check the error in the log below and your EMAIL_* settings.", "EMAIL_FAILED");
    return { status: "SENT" };
  }, "Test email sent");
}

export async function retryEmailAction(id: string): Promise<ActionResult<null>> {
  return action("admin.retryEmail", async () => {
    await requireAdmin();
    const log = await db.emailLog.findUnique({ where: { id: String(id) } });
    if (!log) throw new AppError("Email not found.", "NOT_FOUND", 404);
    if (log.status === "SENT") throw new AppError("This email was already delivered.");
    if (SECRET_TEMPLATES.has(log.template)) throw new AppError("Security links can't be re-sent from the log. Ask the customer to request a new one.");
    const { sendEmail } = await import("@/lib/email");
    const r = await sendEmail({ to: log.to, userId: log.userId, template: log.template, rendered: { subject: log.subject, html: log.html, text: log.text } });
    revalidatePath("/admin/emails");
    if (!r.ok) throw new AppError("Delivery failed again. See the error in the log.", "EMAIL_FAILED");
    return null;
  }, "Email re-sent");
}
