import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, STAGE_LABEL, STAGE_PILL_CLASS, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PreferencesEditor } from "./preferences-editor";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, preferences, created_at")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: payments } = orderIds.length
    ? await supabase.from("payments").select("order_id, amount").in("order_id", orderIds)
    : { data: [] };

  const paidByOrder = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount));
  }

  const billed = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = billed - paid;

  return (
    <div className="flex flex-1 flex-col pb-10">
      <PageHeader back="/dashboard/customers" title={customer.name} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-2 sm:px-6">
        <p className="mb-4 px-1 text-sm text-muted">{customer.phone}</p>

        <div className="glass-card mb-4 rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-mono text-lg font-bold tabular-nums text-teal-900">
                {formatNaira(billed)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Total spend</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold tabular-nums text-teal-900">
                {orders?.length ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-muted">Orders</p>
            </div>
            <div>
              <p
                className={`font-mono text-lg font-bold tabular-nums ${
                  balance > 0 ? "text-red-600" : "text-green-700"
                }`}
              >
                {formatNaira(balance)}
              </p>
              <p className="mt-0.5 text-xs text-muted">{balance > 0 ? "Owing" : "Balance"}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <PreferencesEditor customerId={customer.id} initial={customer.preferences ?? ""} />
        </div>

        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Order history
        </p>
        <div className="flex flex-col gap-2">
          {orders?.map((o) => {
            const status = o.status as OrderStatus;
            return (
              <Link
                key={o.id}
                href={`/dashboard/orders/${o.id}`}
                className="glass-card flex items-center justify-between rounded-2xl px-4 py-3 transition-transform active:scale-[0.99]"
              >
                <div>
                  <p className="text-[15px] font-semibold text-ink">
                    {formatNaira(Number(o.total))}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(o.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_PILL_CLASS[status]}`}
                >
                  {STAGE_LABEL[status]}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
