"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adminCancelOrderAction, updateOrderStatusAction } from "@/lib/actions/admin";

const FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
const LABEL: Record<string, string> = { CONFIRMED: "Confirm order", PACKED: "Mark packed", SHIPPED: "Mark shipped", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Mark delivered" };

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (status === "CANCELLED" || status === "DELIVERED") return <p className="text-sm text-muted">This order is {status.toLowerCase()} — no further actions.</p>;
  const idx = FLOW.indexOf(status);
  const next = status === "PENDING" ? ["CONFIRMED"] : FLOW.slice(idx + 1);
  const cancellable = status === "PENDING" || status === "CONFIRMED";

  const advance = (s: string) =>
    start(async () => {
      const r = await updateOrderStatusAction(orderId, s);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Status updated");
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => advance(next[0])} loading={pending}>{LABEL[next[0]]}</Button>
      {next.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-xs text-muted">Skip ahead to</span>
          {next.slice(1).map((s) => <Button key={s} size="sm" variant="secondary" disabled={pending} onClick={() => advance(s)}>{LABEL[s]}</Button>)}
        </div>
      )}
      {cancellable ? (
        <Button variant="danger" className="w-full" disabled={pending} onClick={() => setOpen(true)}>Cancel order</Button>
      ) : (
        <p className="text-xs text-subtle">Orders can only be cancelled while pending or confirmed.</p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>Stock is returned to inventory, coupon usage and reward points are reversed, and prepaid payments are marked refunded. The customer is notified.</DialogDescription>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (shared with the customer)" className="mt-4" aria-label="Reason" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Keep order</Button>
            <Button variant="danger" loading={pending} disabled={reason.trim().length < 3} onClick={() => start(async () => {
              const r = await adminCancelOrderAction(orderId, reason);
              if (!r.ok) return void toast.error(r.error);
              toast.success("Order cancelled");
              setOpen(false);
              router.refresh();
            })}>Cancel order</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
