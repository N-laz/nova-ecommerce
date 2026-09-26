"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { ErrorNote } from "@/components/ui/states";
import { saveProductAction, uploadImagesAction } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";

type Img = { url: string; alt: string | null; storageKey: string | null; provider: string };
type Spec = { group: string; key: string; value: string; filterable: boolean };
export type ProductFormValues = {
  name: string; slug: string; tagline: string; description: string; price: string; compareAtPrice: string; sku: string; categoryId: string; brandId: string;
  stock: number; lowStockThreshold: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; featured: boolean; trending: boolean; isFlashDrop: boolean;
  tags: string[]; colors: string[]; warranty: string; images: Img[]; specifications: Spec[];
};

const EMPTY: ProductFormValues = { name: "", slug: "", tagline: "", description: "", price: "", compareAtPrice: "", sku: "", categoryId: "", brandId: "", stock: 0, lowStockThreshold: 5, status: "DRAFT", featured: false, trending: false, isFlashDrop: false, tags: [], colors: [], warranty: "", images: [], specifications: [] };

export function ProductForm({ id, initial, categories, brands }: { id?: string; initial?: ProductFormValues; categories: { id: string; name: string }[]; brands: { id: string; name: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValues>(initial ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    setUploading(true);
    const r = await uploadImagesAction(fd).catch(() => ({ ok: false as const, error: "Upload failed. Files must be 5 MB or smaller." }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) return toast.error(r.error);
    set("images", [...v.images, ...r.data.map((d) => ({ ...d, alt: v.name || null }))].slice(0, 10));
    toast.success(`${r.data.length} image${r.data.length > 1 ? "s" : ""} uploaded`);
  }

  function moveImg(i: number, d: -1 | 1) {
    const arr = [...v.images];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("images", arr);
  }

  function submit() {
    setFormError(null);
    startSave(async () => {
      const payload = { ...v, compareAtPrice: v.compareAtPrice === "" ? null : v.compareAtPrice, specifications: v.specifications.filter((s) => s.key || s.value) };
      const r = await saveProductAction(payload, id);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        toast.error(r.error);
        return;
      }
      setErrors({});
      toast.success(r.message ?? "Product saved");
      if (!id) router.push(`/admin/products/${r.data.id}`);
      router.refresh();
    });
  }

  const e = (k: string) => errors[k];

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-card p-5 hairline">
          <h2 className="font-medium">Details</h2>
          <Field label="Name" htmlFor="f-name" error={e("name")}>
            <Input id="f-name" value={v.name} invalid={!!e("name")} onChange={(ev) => { set("name", ev.target.value); if (!slugTouched) set("slug", slugify(ev.target.value)); }} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="URL slug" htmlFor="f-slug" error={e("slug")}><Input id="f-slug" value={v.slug} invalid={!!e("slug")} onChange={(ev) => { setSlugTouched(true); set("slug", ev.target.value); }} /></Field>
            <Field label="SKU" htmlFor="f-sku" error={e("sku")}><Input id="f-sku" value={v.sku} invalid={!!e("sku")} onChange={(ev) => set("sku", ev.target.value.toUpperCase())} placeholder="NV-SON-1001" /></Field>
          </div>
          <Field label="Tagline" htmlFor="f-tag" error={e("tagline")}><Input id="f-tag" value={v.tagline} maxLength={140} onChange={(ev) => set("tagline", ev.target.value)} /></Field>
          <Field label="Description" htmlFor="f-desc" error={e("description")}><Textarea id="f-desc" rows={6} value={v.description} invalid={!!e("description")} onChange={(ev) => set("description", ev.target.value)} /></Field>
        </section>

        <section className="rounded-2xl bg-card p-5 hairline">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Images <span className="text-xs font-normal text-muted">({v.images.length}/10 · first image is the cover)</span></h2>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(ev) => upload(ev.target.files)} />
            <Button type="button" size="sm" variant="secondary" disabled={uploading || v.images.length >= 10} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload</Button>
          </div>
          {v.images.length === 0 ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="grid w-full place-items-center rounded-xl border border-dashed border-border-strong py-12 text-sm text-muted hover:text-foreground cursor-pointer">Drop in product photos — JPG, PNG, WebP or AVIF up to 5 MB</button>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {v.images.map((img, i) => (
                <li key={img.url + i} className="overflow-hidden rounded-xl bg-surface hairline">
                  <div className="relative aspect-square">
                    <Image src={img.url} alt={img.alt ?? ""} fill sizes="200px" className="object-cover" />
                    {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px]">Cover</span>}
                    <button type="button" onClick={() => set("images", v.images.filter((_, j) => j !== i))} aria-label="Remove image" className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 hover:bg-danger cursor-pointer"><X className="size-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-1 p-1.5">
                    <input value={img.alt ?? ""} onChange={(ev) => set("images", v.images.map((m, j) => (j === i ? { ...m, alt: ev.target.value } : m)))} placeholder="Alt text" aria-label="Alt text" className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-2 text-xs outline-none focus:bg-white/5" />
                    <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} aria-label="Move left" className="grid size-6 place-items-center rounded text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"><ArrowUp className="size-3 -rotate-90" /></button>
                    <button type="button" onClick={() => moveImg(i, 1)} disabled={i === v.images.length - 1} aria-label="Move right" className="grid size-6 place-items-center rounded text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"><ArrowDown className="size-3 -rotate-90" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 hairline">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Specifications</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() => set("specifications", [...v.specifications, { group: v.specifications.at(-1)?.group ?? "General", key: "", value: "", filterable: false }])}><Plus /> Add spec</Button>
          </div>
          {v.specifications.length === 0 ? <p className="text-sm text-muted">No specs yet. Specs power the product page, comparison table and shop filters (when marked filterable).</p> : (
            <div className="space-y-2">
              <div className="hidden grid-cols-[140px_1fr_1.4fr_80px_32px] gap-2 px-1 text-xs text-muted md:grid"><span>Group</span><span>Name</span><span>Value</span><span>Filter</span><span /></div>
              {v.specifications.map((s, i) => {
                const upd = (patch: Partial<Spec>) => set("specifications", v.specifications.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-xl p-2 hairline md:grid-cols-[140px_1fr_1.4fr_80px_32px] md:rounded-none md:p-0 md:ring-0 md:[box-shadow:none]">
                    <Input value={s.group} onChange={(ev) => upd({ group: ev.target.value })} placeholder="Display" aria-label="Group" className="h-9" />
                    <Input value={s.key} onChange={(ev) => upd({ key: ev.target.value })} placeholder="Screen size" aria-label="Spec name" className="h-9" invalid={!!e(`specifications.${i}.key`)} />
                    <Input value={s.value} onChange={(ev) => upd({ value: ev.target.value })} placeholder='6.3" OLED' aria-label="Spec value" className="col-span-2 h-9 md:col-span-1" invalid={!!e(`specifications.${i}.value`)} />
                    <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={s.filterable} onChange={(ev) => upd({ filterable: ev.target.checked })} className="accent-[#7C5CFC]" /> Filter</label>
                    <button type="button" onClick={() => set("specifications", v.specifications.filter((_, j) => j !== i))} aria-label="Remove spec" className="grid size-8 place-items-center justify-self-end rounded-lg text-muted hover:bg-danger/15 hover:text-danger cursor-pointer"><Trash2 className="size-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-card p-5 hairline">
          <h2 className="font-medium">Publishing</h2>
          <Field label="Status" htmlFor="f-status"><NativeSelect id="f-status" value={v.status} onChange={(ev) => set("status", ev.target.value as ProductFormValues["status"])}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></NativeSelect></Field>
          {(["featured", "trending", "isFlashDrop"] as const).map((k) => (
            <label key={k} className="flex items-center justify-between text-sm">{k === "isFlashDrop" ? "Flash drop" : k[0].toUpperCase() + k.slice(1)}<input type="checkbox" checked={v[k]} onChange={(ev) => set(k, ev.target.checked)} className="size-4 accent-[#7C5CFC]" /></label>
          ))}
        </section>
        <section className="space-y-4 rounded-2xl bg-card p-5 hairline">
          <h2 className="font-medium">Pricing</h2>
          <Field label="Price (₹, incl. GST)" htmlFor="f-price" error={e("price")}><Input id="f-price" inputMode="decimal" value={v.price} invalid={!!e("price")} onChange={(ev) => set("price", ev.target.value)} /></Field>
          <Field label="Compare-at price (MRP)" htmlFor="f-cmp" error={e("compareAtPrice")} hint="Leave empty for no discount."><Input id="f-cmp" inputMode="decimal" value={v.compareAtPrice} invalid={!!e("compareAtPrice")} onChange={(ev) => set("compareAtPrice", ev.target.value)} /></Field>
        </section>
        <section className="space-y-4 rounded-2xl bg-card p-5 hairline">
          <h2 className="font-medium">Inventory</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock" htmlFor="f-stock" error={e("stock")} hint={id ? "Changes are logged" : undefined}><Input id="f-stock" type="number" min={0} value={v.stock} invalid={!!e("stock")} onChange={(ev) => set("stock", Number(ev.target.value))} /></Field>
            <Field label="Low-stock alert" htmlFor="f-low"><Input id="f-low" type="number" min={0} value={v.lowStockThreshold} onChange={(ev) => set("lowStockThreshold", Number(ev.target.value))} /></Field>
          </div>
        </section>
        <section className="space-y-4 rounded-2xl bg-card p-5 hairline">
          <h2 className="font-medium">Organisation</h2>
          <Field label="Category" htmlFor="f-cat" error={e("categoryId")}><NativeSelect id="f-cat" value={v.categoryId} invalid={!!e("categoryId")} onChange={(ev) => set("categoryId", ev.target.value)}><option value="">Select…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
          <Field label="Brand" htmlFor="f-brand" error={e("brandId")}><NativeSelect id="f-brand" value={v.brandId} invalid={!!e("brandId")} onChange={(ev) => set("brandId", ev.target.value)}><option value="">Select…</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</NativeSelect></Field>
          <Field label="Tags" htmlFor="f-tags" hint="Comma separated"><Input id="f-tags" defaultValue={v.tags.join(", ")} onBlur={(ev) => set("tags", ev.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))} /></Field>
          <Field label="Colours" htmlFor="f-colors" hint="Comma separated"><Input id="f-colors" defaultValue={v.colors.join(", ")} onBlur={(ev) => set("colors", ev.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /></Field>
          <Field label="Warranty" htmlFor="f-war"><Input id="f-war" value={v.warranty} onChange={(ev) => set("warranty", ev.target.value)} placeholder="1 year manufacturer warranty" /></Field>
        </section>
        {formError && <ErrorNote>{formError}</ErrorNote>}
        <div className="sticky bottom-4 flex gap-2">
          <Button type="submit" size="lg" className="flex-1" loading={saving}>{id ? "Save changes" : "Create product"}</Button>
          <Button type="button" size="lg" variant="secondary" onClick={() => router.push("/admin/products")}>Cancel</Button>
        </div>
      </div>
    </form>
  );
}
