"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { cancelOrderAction } from "@/lib/actions/checkout";

const REASONS = ["Ordered by mistake", "Found a better price elsewhere", "Delivery date is too late", "Want to change address or payment", "Other"];

export function CancelOrderButton({ orderNumber, prepaid }: { orderNumber: string; prepaid: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="danger" size="sm">Cancel order</Button></DialogTrigger>
      <DialogContent>
        <DialogTitle>Cancel {orderNumber}?</DialogTitle>
        <DialogDescription>{prepaid ? "Your refund will be initiated to the original payment method within 5–7 business days." : "This order will be cancelled immediately."} Items go back into stock and points earned on this order are reversed.</DialogDescription>
        <div className="mt-5 space-y-4">
          <Field label="Reason" htmlFor="c-reason">
            <NativeSelect id="c-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </NativeSelect>
          </Field>
          {reason === "Other" && (
            <Field label="Tell us more" htmlFor="c-other">
              <Textarea id="c-other" rows={3} value={other} onChange={(e) => setOther(e.target.value)} maxLength={200} />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep order</Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await cancelOrderAction(orderNumber, reason === "Other" ? other : reason);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success("Order cancelled");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Confirm cancellation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
