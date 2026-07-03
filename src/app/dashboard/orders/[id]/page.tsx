import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, type OrderStatus } from "@/lib/format";
import { StageTrack } from "@/components/stage-track";
import { OrderActions } from "./order-actions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total, subtotal, discount_type, discount_value, created_at, customers(name, phone)")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, service_name, quantity, unit_price")
    .eq("order_id", id);

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const customer = order.customers as unknown as { name: string; phone: string } | null;
  const total = Number(order.total);
  const subtotal = Number(order.subtotal);
  const discount = subtotal - total;
  const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = total - paid;

  return (
    <div className="flex flex-1 flex-col">
      <header className="glass-card mx-4 mt-4 flex items-center gap-3 rounded-3xl px-6 py-4 sm:mx-6 sm:mt-6">
        <Link href="/dashboard" className="text-xl text-teal-700">
          ←
        </Link>
        <div>
          <p className="text-sm text-muted">{customer?.phone}</p>
          <p className="text-lg font-semibold tracking-tight text-teal-900">{customer?.name}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        <div className="glass-card rounded-2xl p-5">
          <StageTrack status={order.status as OrderStatus} />

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Items</p>
          <div className="mb-4 flex flex-col">
            {items?.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-ink/10 py-2.5 text-[15px] last:border-b-0"
              >
                <span className="text-ink">
                  {item.service_name} × {item.quantity}
                </span>
                <span className="font-mono tabular-nums text-ink">
                  {formatNaira(item.quantity * Number(item.unit_price))}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-dashed border-ink/15 pt-4 text-sm">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-teal-700">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">−{formatNaira(discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-muted">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatNaira(total)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Paid</span>
              <span className="font-mono tabular-nums">{formatNaira(paid)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-teal-900">
              <span>Balance</span>
              <span className="font-mono tabular-nums">{formatNaira(balance)}</span>
            </div>
          </div>
        </div>

        {!!payments?.length && (
          <div className="glass-card mt-4 rounded-2xl p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Payments
            </p>
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between py-1.5 text-sm">
                <span className="capitalize text-muted">{p.method}</span>
                <span className="font-mono tabular-nums text-ink">
                  {formatNaira(Number(p.amount))}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5">
          <OrderActions orderId={order.id} status={order.status as OrderStatus} balance={balance} />
        </div>
      </main>
    </div>
  );
}
