export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const ORDER_STAGES = ["collected", "processing", "ready", "contacted", "in_transit", "delivered", "picked_up"] as const;
export type OrderStatus = (typeof ORDER_STAGES)[number];

export const STAGE_LABEL: Record<OrderStatus, string> = {
  collected: "Collected",
  processing: "Processing",
  ready: "Ready",
  contacted: "Contacted",
  in_transit: "With Rider",
  delivered: "Delivered",
  picked_up: "Picked Up",
};

// Ready → Contacted (internal, no notification) → then forks: With Rider (→ Delivered),
// Delivered, or Picked Up.
export const NEXT_STAGES: Record<OrderStatus, OrderStatus[]> = {
  collected: ["processing"],
  processing: ["ready"],
  ready: ["contacted"],
  contacted: ["in_transit", "delivered", "picked_up"],
  in_transit: ["delivered"],
  delivered: [],
  picked_up: [],
};

// Completed outcomes — both capture who received the clothes.
export const TERMINAL_STAGES: OrderStatus[] = ["delivered", "picked_up"];
export const isTerminal = (s: OrderStatus) => TERMINAL_STAGES.includes(s);

// The stages where the customer's garments are physically in the shop.
export const IN_STORE_STAGES: OrderStatus[] = ["collected", "processing", "ready", "contacted"];

export const STAGE_PILL_CLASS: Record<OrderStatus, string> = {
  collected: "text-slate-600 bg-slate-200/60",
  processing: "text-amber-700 bg-amber-100/70",
  ready: "text-violet-700 bg-violet-100/70",
  contacted: "text-cyan-700 bg-cyan-100/70",
  in_transit: "text-blue-700 bg-blue-100/70",
  delivered: "text-green-700 bg-green-100/70",
  picked_up: "text-emerald-700 bg-emerald-100/70",
};
