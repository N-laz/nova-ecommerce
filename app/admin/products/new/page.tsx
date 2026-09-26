import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProduct() {
  const [categories, brands] = await Promise.all([db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }), db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })]);
  return (
    <div>
      <PageHeader title="New product" description="Create a product. Save as draft until it's ready to publish." />
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
