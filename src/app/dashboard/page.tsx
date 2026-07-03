import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, STAGE_LABEL, STAGE_PILL_CLASS, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("name, businesses(name)")
    .eq("id", user!.id)
    .single();

  const business = staff?.businesses as unknown as { name: string } | null;

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at, customers(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col pb-28">
      <PageHeader
        eyebrow={business?.name ?? "LaundERA"}
        title="Orders"
        action={
          <Link
            href="/dashboard/new"
            className="btn-primary flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 sm:px-6">
        {!orders?.length && (
          <div className="glass-card rounded-3xl px-6 py-12 text-center">
            <p className="text-lg font-semibold text-teal-900">No orders yet</p>
            <p className="mt-1 text-sm text-muted">
              Tap <span className="font-medium text-teal-700">New</span> to log the first order.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {orders?.map((order) => {
            const customer = order.customers as unknown as { name: string } | null;
            const status = order.status as OrderStatus;
            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="glass-card flex items-center justify-between rounded-2xl px-4 py-3.5 transition-transform active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/25 to-teal-500/10 text-sm font-semibold text-teal-700">
                    {customer?.name?.slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {customer?.name ?? "Unknown customer"}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(order.created_at).toLocaleString("en-NG", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="mb-1.5 font-mono text-sm font-semibold tabular-nums text-teal-900">
                    {formatNaira(Number(order.total))}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_PILL_CLASS[status]}`}
                  >
                    {STAGE_LABEL[status]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
