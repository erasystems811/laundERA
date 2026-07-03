export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const ORDER_STAGES = ["received", "in_process", "ready", "with_rider", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STAGES)[number];

export const STAGE_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  in_process: "In Process",
  ready: "Ready",
  with_rider: "With Rider",
  delivered: "Delivered",
};

export const NEXT_STAGE: Record<OrderStatus, OrderStatus | null> = {
  received: "in_process",
  in_process: "ready",
  ready: "with_rider",
  with_rider: "delivered",
  delivered: null,
};

export const STAGE_PILL_CLASS: Record<OrderStatus, string> = {
  received: "text-slate-600 bg-slate-200/60",
  in_process: "text-amber-700 bg-amber-100/70",
  ready: "text-violet-700 bg-violet-100/70",
  with_rider: "text-blue-700 bg-blue-100/70",
  delivered: "text-green-700 bg-green-100/70",
};
