import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type Range = "today" | "7d" | "30d" | "12m";
export const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "12m", label: "12 Months" },
];

function rangeWindow(range: Range) {
  const now = new Date();
  const start = new Date(now);
  let unit: "hour" | "day" | "month" = "day";
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    unit = "hour";
  } else if (range === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(start.getMonth() - 11, 1);
    start.setHours(0, 0, 0, 0);
    unit = "month";
  }
  const span = now.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);
  return { start, end: now, prevStart, unit };
}

function buckets(start: Date, end: Date, unit: "hour" | "day" | "month") {
  const out: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    out.push(new Date(d));
    if (unit === "hour") d.setHours(d.getHours() + 1);
    else if (unit === "day") d.setDate(d.getDate() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function label(d: Date, unit: "hour" | "day" | "month") {
  if (unit === "hour") return d.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true, timeZone: "Asia/Kolkata" });
  if (unit === "day") return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });
}

const TZ = "Asia/Kolkata";
function keyOf(d: Date, unit: "hour" | "day" | "month") {
  // Build bucket key in IST so it matches SQL date_trunc(... AT TIME ZONE 'Asia/Kolkata')
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  if (unit === "month") return `${get("year")}-${get("month")}`;
  if (unit === "day") return `${get("year")}-${get("month")}-${get("day")}`;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour").replace("24", "00")}`;
}

/** % change vs previous period; null when there is no baseline (avoids a misleading "+100%"). */
function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export async function getDashboardAnalytics(range: Range) {
  const { start, end, prevStart, unit } = rangeWindow(range);
  const live: Prisma.OrderWhereInput = { status: { not: "CANCELLED" } };
  const fmt = unit === "month" ? "YYYY-MM" : unit === "day" ? "YYYY-MM-DD" : "YYYY-MM-DD HH24";

  const [curr, prev, newCustomers, prevCustomers, totalCustomers, productCounts, series, customerSeries, topProducts, topCategories, statusBreakdown, recentOrders] = await Promise.all([
    db.order.aggregate({ where: { ...live, createdAt: { gte: start, lte: end } }, _sum: { total: true }, _count: { _all: true } }),
    db.order.aggregate({ where: { ...live, createdAt: { gte: prevStart, lt: start } }, _sum: { total: true }, _count: { _all: true } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: start, lte: end } } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: prevStart, lt: start } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
    db.$queryRaw<{ bucket: string; revenue: Prisma.Decimal; orders: bigint }[]>`
      SELECT to_char(date_trunc(${unit}, "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), ${fmt}) AS bucket,
             COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders
      FROM "Order"
      WHERE status <> 'CANCELLED' AND "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ bucket: string; customers: bigint }[]>`
      SELECT to_char(date_trunc(${unit}, "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}), ${fmt}) AS bucket, COUNT(*) AS customers
      FROM "User"
      WHERE role = 'CUSTOMER' AND "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ name: string; units: bigint; revenue: Prisma.Decimal }[]>`
      SELECT oi.name, SUM(oi.quantity) AS units, SUM(oi."lineTotal") AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${start} AND o."createdAt" <= ${end}
      GROUP BY oi.name ORDER BY revenue DESC LIMIT 6`,
    db.$queryRaw<{ name: string; revenue: Prisma.Decimal; units: bigint }[]>`
      SELECT c.name, SUM(oi."lineTotal") AS revenue, SUM(oi.quantity) AS units
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${start} AND o."createdAt" <= ${end}
      GROUP BY c.name ORDER BY revenue DESC LIMIT 8`,
    db.order.groupBy({ by: ["status"], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, orderNumber: true, total: true, status: true, createdAt: true, user: { select: { name: true } } } }),
  ]);

  // Customer baseline before window, for cumulative growth line
  const baseline = await db.user.count({ where: { role: "CUSTOMER", createdAt: { lt: start } } });

  const sMap = new Map(series.map((r) => [r.bucket, r]));
  const cMap = new Map(customerSeries.map((r) => [r.bucket, Number(r.customers)]));
  let cumulative = baseline;
  const timeline = buckets(start, end, unit).map((d) => {
    const k = keyOf(d, unit);
    const s = sMap.get(k);
    const newC = cMap.get(k) ?? 0;
    cumulative += newC;
    return { label: label(d, unit), revenue: s ? Number(s.revenue) : 0, orders: s ? Number(s.orders) : 0, newCustomers: newC, customers: cumulative };
  });

  const revenue = Number(curr._sum.total ?? 0);
  const prevRevenue = Number(prev._sum.total ?? 0);
  const orders = curr._count._all;
  const prevOrders = prev._count._all;
  const aov = orders ? revenue / orders : 0;
  const prevAov = prevOrders ? prevRevenue / prevOrders : 0;
  const publishedProducts = productCounts.find((p) => p.status === "PUBLISHED")?._count._all ?? 0;
  const totalProducts = productCounts.reduce((n, p) => n + p._count._all, 0);

  return {
    kpis: {
      revenue: { value: revenue, change: pct(revenue, prevRevenue) },
      orders: { value: orders, change: pct(orders, prevOrders) },
      customers: { value: totalCustomers, newInRange: newCustomers, change: pct(newCustomers, prevCustomers) },
      products: { value: totalProducts, published: publishedProducts },
      aov: { value: aov, change: pct(aov, prevAov) },
    },
    timeline,
    topProducts: topProducts.map((p) => ({ name: p.name, units: Number(p.units), revenue: Number(p.revenue) })),
    topCategories: topCategories.map((c) => ({ name: c.name, units: Number(c.units), revenue: Number(c.revenue) })),
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
    recentOrders: recentOrders.map((o) => ({ ...o, total: o.total.toFixed(2), createdAt: o.createdAt.toISOString() })),
  };
}

export async function getInventoryStats() {
  const [agg, low, out, valueRow] = await Promise.all([
    db.product.aggregate({ _sum: { stock: true }, _count: { _all: true } }),
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "Product" WHERE stock > 0 AND stock <= "lowStockThreshold"`,
    db.product.count({ where: { stock: 0 } }),
    db.$queryRaw<{ v: Prisma.Decimal | null }[]>`SELECT SUM(stock * COALESCE("costPrice", price)) AS v FROM "Product"`,
  ]);
  return { totalUnits: agg._sum.stock ?? 0, skus: agg._count._all, lowStock: Number(low[0]?.n ?? 0), outOfStock: out, value: Number(valueRow[0]?.v ?? 0) };
}
