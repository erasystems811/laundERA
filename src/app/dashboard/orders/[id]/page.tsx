import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBusinessReadOnly } from "@/lib/access";
import { formatNaira, STAGE_LABEL, type OrderStatus } from "@/lib/format";
import { StageTrack } from "@/components/stage-track";
import { PageHeader } from "@/components/page-header";
import { OrderActions } from "./order-actions";
import { AddItems } from "./add-items";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total, subtotal, dropped_off_by, picked_up_by, photos, created_at, customers(name, phone)")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: events } = await supabase
    .from("order_stage_events")
    .select("id, from_stage, to_stage, changed_at")
    .eq("order_id", id)
    .order("changed_at", { ascending: true });

  const { data: staff } = await supabase
    .from("staff")
    .select("businesses(status, expires_at)")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();
  const readOnly = isBusinessReadOnly(staff?.businesses as unknown as { status: string; expires_at: string | null } | null);

  const { data: items } = await supabase
    .from("order_items")
    .select("id, service_name, quantity, unit_price")
    .eq("order_id", id);

  const { data: services } = readOnly
    ? { data: [] }
    : await supabase.from("services").select("id, name, icon, price").eq("active", true).order("name");

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, method, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const customer = order.customers as unknown as { name: string; phone: string } | null;
  const total = Number(order.total);
  const subtotal = Number(order.subtotal);
  const discount = subtotal - total;
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = total - paid;

  return (
    <div>
      <PageHeader back="/dashboard" title={customer?.name ?? "Order"} subtitle={customer?.phone} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="glass-card rounded-2xl p-6">
            <StageTrack status={order.status as OrderStatus} />

            <p className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Items</p>
            <div className="mb-4 flex flex-col">
              {items?.map((item) => (
                <div key={item.id} className="flex justify-between border-b border-ink/10 py-2.5 text-[15px] last:border-b-0">
                  <span className="text-ink">{item.service_name} × {item.quantity}</span>
                  <span className="font-mono tabular-nums text-ink">{formatNaira(item.quantity * Number(item.unit_price))}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-dashed border-ink/15 pt-4 text-sm">
              {discount > 0 && (
                <>
                  <div className="flex justify-between text-muted"><span>Subtotal</span><span className="font-mono tabular-nums">{formatNaira(subtotal)}</span></div>
                  <div className="flex justify-between text-teal-700"><span>Discount</span><span className="font-mono tabular-nums">−{formatNaira(discount)}</span></div>
                </>
              )}
              <div className="flex justify-between text-muted"><span>Total</span><span className="font-mono tabular-nums">{formatNaira(total)}</span></div>
              <div className="flex justify-between text-muted"><span>Paid</span><span className="font-mono tabular-nums">{formatNaira(paid)}</span></div>
              <div className="flex justify-between text-base font-semibold text-teal-900"><span>Balance</span><span className="font-mono tabular-nums">{formatNaira(balance)}</span></div>
            </div>

            {!readOnly && (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <AddItems orderId={order.id} services={services ?? []} />
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Handover</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted">Dropped off by</p>
                <p className="font-medium text-ink">{order.dropped_off_by ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted">Collected by</p>
                <p className="font-medium text-ink">{order.picked_up_by ?? (order.status === "delivered" ? "—" : "Not yet")}</p>
              </div>
            </div>
          </div>

          {!!(order.photos as string[])?.length && (
            <div className="glass-card rounded-2xl p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Photos at intake</p>
              <div className="flex flex-wrap gap-2.5">
                {(order.photos as string[]).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Clothes at intake" className="h-24 w-24 rounded-xl object-cover ring-1 ring-black/5 transition hover:opacity-90" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">History</p>
            {events?.length ? (
              <ol className="flex flex-col gap-0">
                {events.map((ev, i) => (
                  <li key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${i === events.length - 1 ? "bg-teal-500 ring-4 ring-teal-500/15" : "bg-teal-600"}`} />
                      {i < events.length - 1 && <span className="w-0.5 flex-1 bg-ink/10" />}
                    </div>
                    <div className="pb-5">
                      <p className="text-[15px] font-medium text-ink">
                        {ev.from_stage ? `Moved to ${STAGE_LABEL[ev.to_stage as OrderStatus]}` : "Order created"}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(ev.changed_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">
                Created {new Date(order.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
            )}
          </div>

          {!!payments?.length && (
            <div className="glass-card rounded-2xl p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Payments</p>
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between border-b border-ink/5 py-2 text-sm last:border-b-0">
                  <span className="capitalize text-muted">{p.method}</span>
                  <span className="font-mono tabular-nums text-ink">{formatNaira(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="glass-card rounded-2xl p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Current stage</p>
            <p className="mb-4 text-lg font-semibold text-teal-900">{STAGE_LABEL[order.status as OrderStatus]}</p>
            {readOnly ? (
              <p className="rounded-xl bg-amber-50/70 px-4 py-3 text-sm text-amber-700">Account paused — actions are off.</p>
            ) : (
              <OrderActions orderId={order.id} status={order.status as OrderStatus} balance={balance} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
