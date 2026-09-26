"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { saveAddressAction } from "@/lib/actions/checkout";
import { INDIAN_STATES } from "@/lib/validation/checkout";

export type AddressDTO = { id: string; label: string; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };

export function AddressForm({ initial, onSaved, onCancel }: { initial?: AddressDTO | null; onSaved: (id: string) => void; onCancel?: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const input = Object.fromEntries(["label", "fullName", "phone", "line1", "line2", "city", "state", "pincode"].map((k) => [k, String(fd.get(k) ?? "")]));
        start(async () => {
          const r = await saveAddressAction({ ...input, isDefault: fd.get("isDefault") === "on" }, initial?.id);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.error);
            return;
          }
          setErrors({});
          toast.success(initial ? "Address updated" : "Address saved");
          onSaved(r.data.id);
        });
      }}
    >
      <Field label="Full name" htmlFor="a-name" error={errors.fullName}>
        <Input id="a-name" name="fullName" autoComplete="name" defaultValue={initial?.fullName} invalid={!!errors.fullName} />
      </Field>
      <Field label="Mobile number" htmlFor="a-phone" error={errors.phone}>
        <Input id="a-phone" name="phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit mobile" defaultValue={initial?.phone} invalid={!!errors.phone} />
      </Field>
      <Field label="Address" htmlFor="a-line1" error={errors.line1} className="sm:col-span-2">
        <Input id="a-line1" name="line1" autoComplete="address-line1" placeholder="Flat / house no., building, street" defaultValue={initial?.line1} invalid={!!errors.line1} />
      </Field>
      <Field label="Landmark (optional)" htmlFor="a-line2" error={errors.line2} className="sm:col-span-2">
        <Input id="a-line2" name="line2" autoComplete="address-line2" defaultValue={initial?.line2 ?? ""} />
      </Field>
      <Field label="City" htmlFor="a-city" error={errors.city}>
        <Input id="a-city" name="city" autoComplete="address-level2" defaultValue={initial?.city} invalid={!!errors.city} />
      </Field>
      <Field label="State" htmlFor="a-state" error={errors.state}>
        <NativeSelect id="a-state" name="state" defaultValue={initial?.state ?? ""} invalid={!!errors.state}>
          <option value="" disabled>Select state</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Pincode" htmlFor="a-pin" error={errors.pincode}>
        <Input id="a-pin" name="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} defaultValue={initial?.pincode} invalid={!!errors.pincode} />
      </Field>
      <Field label="Label" htmlFor="a-label">
        <NativeSelect id="a-label" name="label" defaultValue={initial?.label ?? "Home"}>
          {["Home", "Work", "Other"].map((l) => <option key={l}>{l}</option>)}
        </NativeSelect>
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault} className="size-4 accent-[#7C5CFC]" /> Make this my default address
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={pending}>{initial ? "Save changes" : "Save address"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
