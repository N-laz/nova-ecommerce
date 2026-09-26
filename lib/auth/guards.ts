import "server-only";
import { redirect } from "next/navigation";
import { AuthError, ForbiddenError } from "@/lib/errors";
import { getCurrentUser, type SessionUser } from "./session";

/** For server actions / route handlers: throws user-safe errors. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}

/** For pages/layouts: redirects instead of throwing. */
export async function requireUserPage(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin`);
  if (user.role !== "ADMIN") redirect("/?denied=admin");
  return user;
}
