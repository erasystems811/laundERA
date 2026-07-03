import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, STAGE_LABEL, STAGE_PILL_CLASS, type OrderStatus } from "@/lib/format";
import { logOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("name, role, business_id, businesses(name)")
    .eq("id", user!.id)
    .single();

  const business = staff?.businesses as unknown as { name: string } | null;

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at, customers(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col">
      <header className="glass-card mx-4 mt-4 flex items-center justify-between rounded-3xl px-6 py-4 sm:mx-6 sm:mt-6">
        <div>
          <p className="text-sm text-muted">{business?.name ?? "LaundERA"}</p>
          <p className="text-lg font-semibold tracking-tight text-teal-900">
            Welcome, {staff?.name}
          </p>
        </div>
        <form action={logOut}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-white/60 bg-white/40 px-4 text-sm font-medium text-ink backdrop-blur-sm hover:bg-white/60"
          >
            Log out
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 pt-6 sm:px-6">
        <h1 className="mb-4 px-1 text-xl font-semibold tracking-tight text-teal-900">Orders</h1>

        {!orders?.length && (
          <p className="glass-card rounded-2xl px-5 py-8 text-center text-muted">
            No orders yet. Tap &ldquo;New Order&rdquo; to create the first one.
          </p>
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

      <div className="fixed inset-x-4 bottom-4 mx-auto max-w-2xl sm:inset-x-6">
        <Link
          href="/dashboard/new"
          className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-medium text-white"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Order
        </Link>
      </div>
    </div>
  );
}
