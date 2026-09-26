"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { changePasswordAction, revokeSessionAction, updateProfileAction } from "@/lib/actions/auth";
import { markNotificationReadAction } from "@/lib/actions/engagement";
import type { ActionResult } from "@/lib/errors";
import { timeAgo } from "@/lib/utils";

function useToastResult(state: ActionResult<null> | null, onOk?: () => void) {
  const last = useRef(state);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      onOk?.();
    } else toast.error(state.error);
  }, [state, onOk]);
}

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  useToastResult(state, router.refresh);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={formAction} className="grid max-w-lg gap-4">
      <Field label="Full name" htmlFor="p-name" error={fe.name}><Input id="p-name" name="name" defaultValue={name} autoComplete="name" invalid={!!fe.name} /></Field>
      <Field label="Email" htmlFor="p-email" hint="Contact support to change your sign-in email."><Input id="p-email" value={email} disabled readOnly /></Field>
      <Field label="Mobile number" htmlFor="p-phone" error={fe.phone}><Input id="p-phone" name="phone" defaultValue={phone} inputMode="numeric" autoComplete="tel-national" invalid={!!fe.phone} /></Field>
      <Button type="submit" loading={pending} className="w-fit">Save changes</Button>
    </form>
  );
}

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(changePasswordAction, null);
  useToastResult(state, () => formRef.current?.reset());
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form ref={formRef} action={formAction} className="grid max-w-lg gap-4">
      <Field label="Current password" htmlFor="pw-cur" error={fe.currentPassword}><Input id="pw-cur" name="currentPassword" type="password" autoComplete="current-password" invalid={!!fe.currentPassword} /></Field>
      <Field label="New password" htmlFor="pw-new" error={fe.newPassword} hint="At least 8 characters with a letter and a number."><Input id="pw-new" name="newPassword" type="password" autoComplete="new-password" invalid={!!fe.newPassword} /></Field>
      <Field label="Confirm new password" htmlFor="pw-conf" error={fe.confirmPassword}><Input id="pw-conf" name="confirmPassword" type="password" autoComplete="new-password" invalid={!!fe.confirmPassword} /></Field>
      <Button type="submit" loading={pending} className="w-fit">Update password</Button>
    </form>
  );
}

export function SessionRow({ id, userAgent, ip, lastUsed, current }: { id: string; userAgent: string | null; ip: string | null; lastUsed: string; current: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const mobile = /mobile|iphone|android/i.test(userAgent ?? "");
  const browser = /edg/i.test(userAgent ?? "") ? "Edge" : /chrome/i.test(userAgent ?? "") ? "Chrome" : /firefox/i.test(userAgent ?? "") ? "Firefox" : /safari/i.test(userAgent ?? "") ? "Safari" : "Browser";
  const os = /windows/i.test(userAgent ?? "") ? "Windows" : /mac os/i.test(userAgent ?? "") ? "macOS" : /android/i.test(userAgent ?? "") ? "Android" : /iphone|ipad/i.test(userAgent ?? "") ? "iOS" : /linux/i.test(userAgent ?? "") ? "Linux" : "Unknown OS";
  const Icon = mobile ? Smartphone : Monitor;
  return (
    <li className="flex items-center gap-4 py-4">
      <Icon className="size-5 text-muted" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{browser} on {os} {current && <span className="ml-1 text-xs text-success">This device</span>}</p>
        <p className="text-xs text-muted">{ip ?? "Unknown IP"} · Active {timeAgo(lastUsed)}</p>
      </div>
      {!current && (
        <Button size="sm" variant="ghost" loading={pending} onClick={() => start(async () => {
          const r = await revokeSessionAction(id);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Device signed out");
          router.refresh();
        })}>Sign out</Button>
      )}
    </li>
  );
}

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={disabled} loading={pending} onClick={() => start(async () => {
      const r = await markNotificationReadAction();
      if (!r.ok) return void toast.error(r.error);
      router.refresh();
    })}>Mark all as read</Button>
  );
}

export function NotificationLink({ id, href, unread, children }: { id: string; href: string | null; unread: boolean; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      className="flex w-full gap-3 p-4 text-left transition hover:bg-white/[0.02] cursor-pointer"
      onClick={async () => {
        if (unread) await markNotificationReadAction(id);
        if (href) router.push(href);
        else router.refresh();
      }}
    >
      {children}
    </button>
  );
}
