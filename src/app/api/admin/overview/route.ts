import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOperator } from "@/lib/operator";

// GET /api/admin/overview — cross-tenant totals for the operator dashboard.
export async function GET(req: NextRequest) {
  if (!isOperator(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const { data: businesses } = await admin.from("businesses").select("status");
  const { count: orders } = await admin.from("orders").select("id", { count: "exact", head: true });
  const { data: payments } = await admin.from("payments").select("amount");

  const total = businesses?.length ?? 0;
  const active = (businesses ?? []).filter((b) => b.status === "active").length;
  const paused = total - active;
  const collected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    businesses: { total, active, paused },
    orders: orders ?? 0,
    collected,
  });
}
