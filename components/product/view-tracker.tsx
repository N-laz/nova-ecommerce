"use client";

import { useEffect } from "react";
import { trackViewAction } from "@/lib/actions/browse";

export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackViewAction(productId).catch(() => {});
  }, [productId]);
  return null;
}
