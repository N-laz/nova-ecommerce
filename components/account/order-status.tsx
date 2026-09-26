import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "default" | "accent" | "success" | "danger" | "warning" }> = {
  PENDING: { label: "Pending payment", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "accent" },
  PACKED: { label: "Packed", variant: "accent" },
  SHIPPED: { label: "Shipped", variant: "accent" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", variant: "accent" },
  DELIVERED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export const statusLabel = (s: string) => MAP[s]?.label ?? s;
