"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { AddressForm, type AddressDTO } from "@/components/checkout/address-form";
import { deleteAddressAction, setDefaultAddressAction } from "@/lib/actions/checkout";

export function AddressBook({ addresses }: { addresses: AddressDTO[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error((r as { error: string }).error);
      toast.success(msg);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing !== "new" && (
        <EmptyState icon={<MapPin />} title="No saved addresses" description="Save an address to check out faster." action={<Button onClick={() => setEditing("new")}><Plus /> Add address</Button>} />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="rounded-2xl bg-card p-5 hairline md:col-span-2">
              <AddressForm initial={a} onSaved={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={a.id} className="flex flex-col rounded-2xl bg-card p-5 text-sm hairline">
              <p className="flex items-center gap-2 font-medium">{a.fullName} <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">{a.label}</span>{a.isDefault && <span className="text-xs text-accent">Default</span>}</p>
              <p className="mt-2 text-muted">{a.line1}{a.line2 && `, ${a.line2}`}</p>
              <p className="text-muted">{a.city}, {a.state} – {a.pincode}</p>
              <p className="text-muted">+91 {a.phone}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(a.id)}><Pencil /> Edit</Button>
                {!a.isDefault && <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setDefaultAddressAction(a.id), "Default address updated")}>Set as default</Button>}
                <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Delete this address?") && run(() => deleteAddressAction(a.id), "Address deleted")}><Trash2 /> Delete</Button>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <div className="rounded-2xl bg-card p-5 hairline">
          <p className="mb-4 font-medium">New address</p>
          <AddressForm onSaved={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        addresses.length > 0 && <Button variant="secondary" onClick={() => setEditing("new")}><Plus /> Add address</Button>
      )}
    </div>
  );
}
