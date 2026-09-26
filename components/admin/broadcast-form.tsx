"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { broadcastPromoAction } from "@/lib/actions/admin";

export function BroadcastForm({ audience }: { audience: number }) {
  const router = useRouter();
  const [v, setV] = useState({ title: "", body: "", link: "/shop", email: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(`Send this notification to ${audience} customers?`)) return;
        start(async () => {
          const r = await broadcastPromoAction(v);
          if (!r.ok) { setErrors(r.fieldErrors ?? {}); return void toast.error(r.error); }
          setErrors({});
          toast.success(`Sent to ${r.data.sent} customers`);
          setV({ title: "", body: "", link: "/shop", email: false });
          router.refresh();
        });
      }}
      className="space-y-4 rounded-2xl bg-card p-5 hairline"
    >
      <Field label="Title" htmlFor="b-title" error={errors.title}><Input id="b-title" maxLength={80} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Weekend audio sale is live" invalid={!!errors.title} /></Field>
      <Field label="Message" htmlFor="b-body" error={errors.body} hint={`${v.body.length}/240`}><Textarea id="b-body" rows={3} maxLength={240} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="Use code AUDIO2K for ₹2,000 off headphones above ₹25,000." invalid={!!errors.body} /></Field>
      <Field label="Link" htmlFor="b-link" error={errors.link} hint="A path on this site, e.g. /shop?category=audio"><Input id="b-link" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} invalid={!!errors.link} /></Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={v.email} onChange={(e) => setV({ ...v, email: e.target.checked })} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
        <span>Also send by email<span className="block text-xs text-muted">Only customers who allow offer emails receive it. Everyone gets the in-app notification.</span></span>
      </label>
      <Button type="submit" loading={pending}><Send /> Send to {audience} customers</Button>
    </form>
  );
}
