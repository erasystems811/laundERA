import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PaymentsTable } from "./payments-table";

type Row = {
  id: string;
  customer_name: string;
  customer_id: string;
  created_at: string;
  total: number;
  paid: number;
  balance: number;
};

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("staff")
    .select("businesses(status)")
    .eq("id", user!.id)
    .single();
  const readOnly = (staff?.businesses as unknown as { status: string } | null)?.status === "paused";

  const { data } = await supabase.rpc("outstanding_orders", { p_limit: 100, p_offset: 0 });
  const rows = (data ?? []) as Row[];
  const totalOwed = rows.reduce((s, r) => s + Number(r.balance), 0);

  return (
    <div>
      <PageHeader title="Payments" subtitle={`${rows.length} unpaid order${rows.length === 1 ? "" : "s"} · ${formatNaira(totalOwed)} outstanding`} />

      {!rows.length ? (
        <div className="glass-card rounded-3xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-teal-900">All settled 🎉</p>
          <p className="mt-1 text-sm text-muted">No outstanding balances right now.</p>
        </div>
      ) : (
        <PaymentsTable rows={rows} readOnly={readOnly} />
      )}
    </div>
  );
}
