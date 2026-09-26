import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { AddressBook } from "@/components/account/address-book";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUserPage("/account/addresses");
  const rows = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div>
      <h2 className="mb-5 text-xl font-semibold">Saved addresses</h2>
      <AddressBook addresses={rows.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))} />
    </div>
  );
}
