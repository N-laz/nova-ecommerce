"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { retryEmailAction, sendTestEmailAction } from "@/lib/actions/admin";

export function SendTestEmail({ to }: { to: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await sendTestEmailAction();
          if (!r.ok) toast.error(r.error);
          else toast.success(`Test email sent to ${to}`);
          router.refresh();
        })
      }
    >
      <Send /> Send test email
    </Button>
  );
}

export function EmailPreview({ id, subject, to }: { id: string; subject: string; to: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="icon-sm" variant="ghost" aria-label={`Preview “${subject}”`} onClick={() => setOpen(true)}><Eye /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <div className="border-b border-border p-5 pr-12">
            <DialogTitle className="text-base">{subject}</DialogTitle>
            <DialogDescription>To {to}</DialogDescription>
          </div>
          {open && <iframe title={`Email preview: ${subject}`} src={`/admin/emails/${id}/preview`} sandbox="" className="h-[70dvh] w-full rounded-b-2xl bg-[#08090B]" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RetryEmail({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label="Retry delivery"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await retryEmailAction(id);
          if (!r.ok) toast.error(r.error);
          else toast.success(r.message ?? "Email re-sent");
          router.refresh();
        })
      }
    >
      <RotateCw />
    </Button>
  );
}
