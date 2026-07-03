"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { formatNaira } from "@/lib/format";

const IN = "#0f9b8e";
const OUT = "#d97706";
const GRID = "rgba(8,33,31,0.07)";
const AXIS = "#4c716d";

function naira(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n}`;
}

type TipEntry = { name?: string; value?: number; color?: string; fill?: string };

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-mono font-semibold text-ink">{formatNaira(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export function InOutChart({ data }: { data: { month: string; In: number; Out: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={naira} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(8,33,31,0.04)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: AXIS }} />
        <Bar dataKey="In" fill={IN} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="Out" fill={OUT} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProfitChart({ data }: { data: { month: string; Profit: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={naira} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(8,33,31,0.04)" }} />
        <Bar dataKey="Profit" radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.Profit >= 0 ? IN : "#e11d48"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ServiceRevenueChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={naira} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(8,33,31,0.04)" }} />
        <Bar dataKey="value" name="Revenue" fill={IN} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
