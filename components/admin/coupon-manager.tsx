"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ErrorNote } from "@/components/ui/states";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { deleteCouponAction, saveCouponAction, toggleCouponAction } from "@/lib/actions/admin";
import { formatINR } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export type CouponRow = {
  id: string; code: string; description: string | null; type: "PERCENTAGE" | "FIXED"; value: string; minOrderAmount: string; maxDiscount: string | null;
  usageLimit: number | null; perUserLimit: number; usedCount: number; startsAt: string; expiresAt: string | null; active: boolean;
};
type Form = Omit<CouponRow, "id" | "usedCount" | "usageLimit" | "perUserLimit"> & { usageLimit: string; perUserLimit: string };

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v + ":00+05:30").toISOString() : null);
const blank = (): Form => ({ code: "", description: "", type: "PERCENTAGE", value: "", minOrderAmount: "0", maxDiscount: "", usageLimit: "", perUserLimit: "1", startsAt: new Date().toISOString(), expiresAt: null, active: true });

function state(c: CouponRow) {
  const now = Date.now();
  if (!c.active) return ["Inactive", "default"] as const;
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return ["Expired", "danger"] as const;
  if (new Date(c.startsAt).getTime() > now) return ["Scheduled", "warning"] as const;
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return ["Used up", "danger"] as const;
  return ["Live", "success"] as const;
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const f = editing?.form;
  const set = (k: keyof Form, v: string | boolean | null) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const open = (c?: CouponRow) => {
    setErrors({}); setFormError(null);
    setEditing(c ? { id: c.id, form: { ...c, description: c.description ?? "", maxDiscount: c.maxDiscount ?? "", usageLimit: c.usageLimit?.toString() ?? "", perUserLimit: String(c.perUserLimit) } } : { form: blank() });
  };

  const save = () => editing && start(async () => {
    const x = editing.form;
    const r = await saveCouponAction({ ...x, maxDiscount: x.maxDiscount || null, usageLimit: x.usageLimit || null, expiresAt: x.expiresAt || null }, editing.id);
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); setFormError(r.error); return; }
    toast.success(r.message ?? "Saved");
    setEditing(null);
    router.refresh();
  });

  const quick = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => start(async () => {
    const r = await fn();
    if (!r.ok) return void toast.error(r.error);
    toast.success(r.message ?? "Done");
    router.refresh();
  });

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open()}><Plus /> New coupon</Button></div>
      <div className="overflow-hidden rounded-2xl bg-card hairline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted"><tr><th className="px-5 py-3 font-normal">Code</th><th className="font-normal">Discount</th><th className="font-normal">Min order</th><th className="font-normal">Usage</th><th className="font-normal">Valid</th><th className="font-normal">State</th><th className="font-normal">Active</th><th /></tr></thead>
            <tbody className="divide-y divide-border">
              {coupons.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-muted">No coupons yet.</td></tr>}
              {coupons.map((c) => {
                const [label, variant] = state(c);
                return (
                  <tr key={c.id}>
                    <td className="px-5 py-3"><span className="font-mono font-medium">{c.code}</span>{c.description && <span className="block max-w-56 truncate text-xs text-muted">{c.description}</span>}</td>
                    <td>{c.type === "PERCENTAGE" ? `${Number(c.value)}%` : formatINR(c.value)}{c.maxDiscount && <span className="block text-xs text-muted">max {formatINR(c.maxDiscount)}</span>}</td>
                    <td className="tabular text-muted">{Number(c.minOrderAmount) ? formatINR(c.minOrderAmount) : "—"}</td>
                    <td className="tabular">{c.usedCount}{c.usageLimit != null && <span className="text-muted"> / {c.usageLimit}</span>}<span className="block text-xs text-muted">{c.perUserLimit} per customer</span></td>
                    <td className="text-xs text-muted">{formatDate(c.startsAt)}<br />{c.expiresAt ? `→ ${formatDate(c.expiresAt)}` : "No expiry"}</td>
                    <td><Badge variant={variant}>{label}</Badge></td>
                    <td><input type="checkbox" role="switch" aria-label={`Toggle ${c.code}`} checked={c.active} disabled={pending} onChange={(e) => quick(() => toggleCouponAction(c.id, e.target.checked))} className="size-4 accent-[#7C5CFC]" /></td>
                    <td className="pr-3 text-right whitespace-nowrap">
                      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${c.code}`} onClick={() => open(c)}><Pencil /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Delete ${c.code}`} disabled={pending} onClick={() => confirm(`Delete ${c.code}?`) && quick(() => deleteCouponAction(c.id))}><Trash2 /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing?.id ? `Edit ${f?.code}` : "New coupon"}</DialogTitle>
          <DialogDescription>Discounts are always recalculated and validated on the server at checkout.</DialogDescription>
          {f && (
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="mt-5 grid grid-cols-2 gap-3" noValidate>
              <Field label="Code" htmlFor="c-code" error={errors.code}><Input id="c-code" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} invalid={!!errors.code} /></Field>
              <Field label="Type" htmlFor="c-type"><NativeSelect id="c-type" value={f.type} onChange={(e) => set("type", e.target.value)}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></NativeSelect></Field>
              <Field label="Description" htmlFor="c-desc" className="col-span-2"><Input id="c-desc" value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
              <Field label={f.type === "PERCENTAGE" ? "Percent off" : "Amount off (₹)"} htmlFor="c-val" error={errors.value}><Input id="c-val" inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} invalid={!!errors.value} /></Field>
              <Field label="Max discount (₹)" htmlFor="c-max" error={errors.maxDiscount} hint="Optional cap"><Input id="c-max" inputMode="decimal" value={f.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", e.target.value)} /></Field>
              <Field label="Minimum order (₹)" htmlFor="c-min" error={errors.minOrderAmount}><Input id="c-min" inputMode="decimal" value={f.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} /></Field>
              <Field label="Total usage limit" htmlFor="c-lim" hint="Empty = unlimited" error={errors.usageLimit}><Input id="c-lim" type="number" min={1} value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} /></Field>
              <Field label="Per-customer limit" htmlFor="c-pu" error={errors.perUserLimit}><Input id="c-pu" type="number" min={1} value={f.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} /></Field>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#7C5CFC]" /> Active</label>
              <Field label="Starts (IST)" htmlFor="c-start" error={errors.startsAt}><Input id="c-start" type="datetime-local" value={toLocal(f.startsAt)} onChange={(e) => set("startsAt", fromLocal(e.target.value) ?? new Date().toISOString())} /></Field>
              <Field label="Expires (IST)" htmlFor="c-exp" error={errors.expiresAt} hint="Empty = never"><Input id="c-exp" type="datetime-local" value={toLocal(f.expiresAt)} onChange={(e) => set("expiresAt", fromLocal(e.target.value))} /></Field>
              {formError && <div className="col-span-2"><ErrorNote>{formError}</ErrorNote></div>}
              <div className="col-span-2 mt-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={pending}>{editing?.id ? "Save" : "Create coupon"}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
