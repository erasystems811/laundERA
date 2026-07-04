"use client";

import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/format";

export function CustomerRow({
  id,
  name,
  phone,
  count,
  spend,
  balance,
}: {
  id: string;
  name: string;
  phone: string;
  count: number;
  spend: number;
  balance: number;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/dashboard/customers/${id}`)}
      className="cursor-pointer border-b border-ink/5 last:border-b-0 hover:bg-white/40"
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/25 to-teal-500/10 text-xs font-semibold text-teal-700">
            {name.slice(0, 2).toUpperCase()}
          </span>
          <span className="font-medium text-ink">{name}</span>
        </div>
      </td>
      <td className="px-5 py-3 text-muted">{phone}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{count}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{formatNaira(spend)}</td>
      <td className="px-5 py-3 text-right">
        {balance > 0 ? (
          <span className="font-mono font-semibold tabular-nums text-red-600">{formatNaira(balance)}</span>
        ) : (
          <span className="inline-flex rounded-full bg-green-100/70 px-2.5 py-1 text-xs font-semibold text-green-700">Paid up</span>
        )}
      </td>
      <td className="px-3 py-3 text-right text-muted-2">›</td>
    </tr>
  );
}
