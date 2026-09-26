import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Admin-only raw HTML of a logged email, rendered inside a sandboxed iframe. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const log = await db.emailLog.findUnique({ where: { id }, select: { html: true } });
  if (!log) return new Response("Not found", { status: 404 });
  return new Response(log.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src * data:; style-src 'unsafe-inline'",
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
