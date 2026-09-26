"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adjustStockAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export function StockAdjust({ productId, name, stock }: { productId: string; name: string; stock: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("PURCHASE");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const n = Number(qty) || 0;
  const after = mode === "add" ? stock + n : mode === "remove" ? stock - n : n;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(true); setErr(null); }} aria-label={`Adjust stock for ${name}`}><SlidersHorizontal /> Adjust</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{name} · currently {stock} in stock. Every change is written to the inventory ledger.</DialogDescription>
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-full p-1 hairline" role="radiogroup">
            {(["add", "remove", "set"] as const).map((m) => (
              <button key={m} role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setReason(m === "add" ? "PURCHASE" : m === "remove" ? "DAMAGED" : "ADJUSTMENT"); }} className={cn("rounded-full py-1.5 text-sm capitalize cursor-pointer", mode === m ? "bg-white text-black" : "text-muted")}>{m}</button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label={mode === "set" ? "New stock level" : "Quantity"} htmlFor="adj-q"><Input id="adj-q" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
            <Field label="Reason" htmlFor="adj-r"><NativeSelect id="adj-r" value={reason} onChange={(e) => setReason(e.target.value)}>{["PURCHASE", "RESTOCK", "RETURN", "DAMAGED", "ADJUSTMENT"].map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}</NativeSelect></Field>
          </div>
          <Field label="Note (optional)" htmlFor="adj-n" className="mt-3"><Input id="adj-n" value={note} onChange={(e) => setNote(e.target.value)} placeholder="PO #4471 from distributor" /></Field>
          <p className={cn("mt-3 text-sm", after < 0 ? "text-danger" : "text-muted")}>{after < 0 ? `Can't remove more than ${stock} units — stock can't go negative.` : <>New stock: <span className="text-foreground tabular">{after}</span></>}</p>
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending} disabled={qty === "" || after < 0 || (mode !== "set" && n === 0)} onClick={() => start(async () => {
              const r = await adjustStockAction({ productId, mode, quantity: n, reason, note: note || undefined });
              if (!r.ok) return setErr(r.error);
              toast.success(`Stock updated to ${r.data.stock}`);
              setOpen(false); setQty(""); setNote("");
              router.refresh();
            })}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
