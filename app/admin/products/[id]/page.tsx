import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, categories, brands] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, specifications: { orderBy: { position: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  return (
    <div>
      <PageHeader title={p.name} description={`SKU ${p.sku} · ${p.soldCount} sold`} actions={p.status === "PUBLISHED" && <Button asChild variant="secondary" size="sm"><Link href={`/product/${p.slug}`} target="_blank"><ExternalLink /> View in store</Link></Button>} />
      <ProductForm
        id={p.id}
        categories={categories}
        brands={brands}
        initial={{
          name: p.name, slug: p.slug, tagline: p.tagline ?? "", description: p.description, price: p.price.toString(), compareAtPrice: p.compareAtPrice?.toString() ?? "", sku: p.sku,
          categoryId: p.categoryId, brandId: p.brandId, stock: p.stock, lowStockThreshold: p.lowStockThreshold, status: p.status, featured: p.featured, trending: p.trending, isFlashDrop: p.isFlashDrop,
          tags: p.tags, colors: p.colors, warranty: p.warranty ?? "",
          images: p.images.map((i) => ({ url: i.url, alt: i.alt, storageKey: i.storageKey, provider: i.provider })),
          specifications: p.specifications.map((s) => ({ group: s.group, key: s.key, value: s.value, filterable: s.filterable })),
        }}
      />
    </div>
  );
}
