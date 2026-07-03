import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOperator } from "@/lib/operator";

// GET /api/admin/businesses/:id — one tenant's detail + stats.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isOperator(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();

  const { data: business, error } = await admin
    .from("businesses")
    .select("id, name, whatsapp_number, address, status, created_at")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { count: orders } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", id);
  const { count: customers } = await admin
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("business_id", id);
  const { count: staffCount } = await admin
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("business_id", id);
  const { data: payments } = await admin.from("payments").select("amount").eq("business_id", id);
  const collected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    id: business.id,
    name: business.name,
    whatsapp: business.whatsapp_number,
    address: business.address,
    status: business.status,
    createdAt: business.created_at,
    stats: { orders: orders ?? 0, customers: customers ?? 0, staff: staffCount ?? 0, collected },
  });
}

// PATCH /api/admin/businesses/:id — suspend (status:paused) or reactivate (status:active).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isOperator(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "active" && body.status !== "paused") {
    return NextResponse.json({ error: "status must be 'active' or 'paused'" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ status: body.status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id, status: body.status });
}
