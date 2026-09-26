"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatINR } from "@/lib/format";

type Point = { label: string; revenue: number; orders: number; customers: number; newCustomers: number };

const axis = { stroke: "#5b5f68", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = { contentStyle: { background: "#15171D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }, labelStyle: { color: "#8B8F98" }, cursor: { fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.1)" } };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.35} /><stop offset="100%" stopColor="#7C5CFC" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={56} tickFormatter={(v) => `₹${formatCompact(v)}`} />
        <Tooltip {...tooltipStyle} formatter={(v) => [formatINR(Number(v)), "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke="#7C5CFC" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={32} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v, "Orders"]} />
        <Bar dataKey="orders" fill="#e7e7ea" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CustomersChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={32} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n === "customers" ? "Total customers" : "New customers"]} />
        <Line type="monotone" dataKey="customers" stroke="#22C55E" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="newCustomers" stroke="#8B8F98" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
