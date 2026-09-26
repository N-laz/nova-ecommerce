"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/store/store-provider";
import { clearCompareAction } from "@/lib/actions/browse";

export function CompareRemove({ productId, name }: { productId: string; name: string }) {
  const { toggleCompare } = useStore();
  const router = useRouter();
  return (
    <button onClick={async () => { await toggleCompare(productId); router.refresh(); }} aria-label={`Remove ${name} from comparison`} className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full glass hairline cursor-pointer">
      <X className="size-3.5" />
    </button>
  );
}

export function CompareClear() {
  const router = useRouter();
  return <Button variant="ghost" size="sm" onClick={async () => { await clearCompareAction(); router.refresh(); }}>Clear all</Button>;
}

export function CompareAdd({ productId }: { productId: string }) {
  const { addToCart, pending } = useStore();
  return <Button size="sm" className="w-full" loading={pending.has(`cart:${productId}`)} onClick={() => addToCart(productId)}>Add to cart</Button>;
}
