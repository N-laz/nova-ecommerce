"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserRoleAction } from "@/lib/actions/admin";

export function RoleSelect({ userId, role, self }: { userId: string; role: string; self: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (self) return <span className="text-xs text-muted">{role.toLowerCase()} (you)</span>;
  return (
    <select
      aria-label="Role"
      value={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (!confirm(next === "ADMIN" ? "Grant full admin access to this user?" : "Remove admin access? They'll be signed out.")) return;
        start(async () => {
          const r = await setUserRoleAction(userId, next);
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message ?? "Role updated");
          router.refresh();
        });
      }}
      className="h-8 rounded-lg border border-border bg-surface px-2 text-xs outline-none"
    >
      <option value="CUSTOMER">Customer</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
