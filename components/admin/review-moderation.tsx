"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moderateReviewAction } from "@/lib/actions/admin";

export function ReviewModeration({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (s: "APPROVED" | "HIDDEN" | "DELETE") => start(async () => {
    if (s === "DELETE" && !confirm("Delete this review permanently?")) return;
    const r = await moderateReviewAction(id, s);
    if (!r.ok) return void toast.error(r.error);
    toast.success(s === "APPROVED" ? "Review approved" : s === "HIDDEN" ? "Review hidden" : "Review deleted");
    router.refresh();
  });
  return (
    <div className="flex gap-1.5">
      {status !== "APPROVED" && <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("APPROVED")}><Check /> Approve</Button>}
      {status !== "HIDDEN" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("HIDDEN")}><EyeOff /> Hide</Button>}
      <Button size="icon-sm" variant="ghost" disabled={pending} onClick={() => run("DELETE")} aria-label="Delete review"><Trash2 /></Button>
    </div>
  );
}
