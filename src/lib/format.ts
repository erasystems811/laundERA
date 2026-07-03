export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const ORDER_STAGES = ["collected", "processing", "ready", "in_transit", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STAGES)[number];

export const STAGE_LABEL: Record<OrderStatus, string> = {
  collected: "Collected",
  processing: "Processing",
  ready: "Ready",
  in_transit: "In Transit",
  delivered: "Delivered",
};

export const NEXT_STAGE: Record<OrderStatus, OrderStatus | null> = {
  collected: "processing",
  processing: "ready",
  ready: "in_transit",
  in_transit: "delivered",
  delivered: null,
};

// The three stages where the customer's garments are physically in the shop.
export const IN_STORE_STAGES: OrderStatus[] = ["collected", "processing", "ready"];

export const STAGE_PILL_CLASS: Record<OrderStatus, string> = {
  collected: "text-slate-600 bg-slate-200/60",
  processing: "text-amber-700 bg-amber-100/70",
  ready: "text-violet-700 bg-violet-100/70",
  in_transit: "text-blue-700 bg-blue-100/70",
  delivered: "text-green-700 bg-green-100/70",
};
