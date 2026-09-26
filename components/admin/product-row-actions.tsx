"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Eye, EyeOff, Star, Flame, Trash2, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteProductAction, setProductFlagAction } from "@/lib/actions/admin";

export function ProductRowActions({ id, slug, status, featured, trending }: { id: string; slug: string; status: string; featured: boolean; trending: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, fallback: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? fallback);
      router.refresh();
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/6 hover:text-foreground disabled:opacity-40 cursor-pointer" disabled={pending} aria-label="Product actions"><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild><Link href={`/admin/products/${id}`}><Pencil /> Edit</Link></DropdownMenuItem>
        {status === "PUBLISHED" && <DropdownMenuItem asChild><Link href={`/product/${slug}`} target="_blank"><ExternalLink /> View in store</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        {status === "PUBLISHED" ? (
          <DropdownMenuItem onSelect={() => run(() => setProductFlagAction(id, "status", "DRAFT"), "Unpublished")}><EyeOff /> Unpublish</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => setProductFlagAction(id, "status", "PUBLISHED"), "Published")}><Eye /> Publish</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => run(() => setProductFlagAction(id, "featured", !featured), "Updated")}><Star /> {featured ? "Remove from featured" : "Mark featured"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => setProductFlagAction(id, "trending", !trending), "Updated")}><Flame /> {trending ? "Remove trending" : "Mark trending"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger" onSelect={() => confirm("Delete this product? Products with orders are archived instead.") && run(async () => {
          const r = await deleteProductAction(id);
          return r.ok ? { ok: true, message: r.data.archived ? "Product has orders — archived instead" : "Product deleted" } : r;
        }, "Deleted")}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
