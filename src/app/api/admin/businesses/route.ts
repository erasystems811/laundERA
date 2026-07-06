import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOperator, phoneToLoginEmail } from "@/lib/operator";

// GET /api/admin/businesses — list every laundry business with headline stats.
export async function GET(req: NextRequest) {
  if (!isOperator(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: businesses, error } = await admin
    .from("businesses")
    .select("id, name, whatsapp_number, status, expires_at, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: orders } = await admin.from("orders").select("business_id, total");
  const { data: payments } = await admin.from("payments").select("business_id, amount");

  const orderCount = new Map<string, number>();
  const revenue = new Map<string, number>();
  for (const o of orders ?? []) orderCount.set(o.business_id, (orderCount.get(o.business_id) ?? 0) + 1);
  for (const p of payments ?? [])
    revenue.set(p.business_id, (revenue.get(p.business_id) ?? 0) + Number(p.amount));

  const rows = (businesses ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    whatsapp: b.whatsapp_number,
    status: b.status,
    expiresAt: b.expires_at,
    createdAt: b.created_at,
    orders: orderCount.get(b.id) ?? 0,
    collected: revenue.get(b.id) ?? 0,
  }));

  return NextResponse.json({ businesses: rows });
}

// POST /api/admin/businesses — onboard a new laundry: create the business + its owner login.
export async function POST(req: NextRequest) {
  if (!isOperator(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; ownerName?: string; ownerPhone?: string; pin?: string; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const ownerName = body.ownerName?.trim();
  const ownerPhone = body.ownerPhone?.trim();
  const pin = body.pin?.trim();
  const expiresAt = body.expiresAt?.trim() || null;

  if (!name || !ownerName || !ownerPhone || !pin) {
    return NextResponse.json(
      { error: "name, ownerName, ownerPhone and pin are all required" },
      { status: 400 }
    );
  }
  if (!/^\d{4,}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
  }
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    return NextResponse.json({ error: "expiresAt must be YYYY-MM-DD" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: business, error: bizError } = await admin
    .from("businesses")
    .insert({ name, expires_at: expiresAt })
    .select("id")
    .single();
  if (bizError) return NextResponse.json({ error: bizError.message }, { status: 500 });

  const email = phoneToLoginEmail(ownerPhone);
  const { data: userResult, error: userError } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  });
  if (userError) {
    // roll back the business so a failed owner doesn't leave an orphan tenant
    await admin.from("businesses").delete().eq("id", business.id);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { error: staffError } = await admin.from("staff").insert({
    id: userResult.user.id,
    business_id: business.id,
    name: ownerName,
    phone: ownerPhone,
    role: "owner",
  });
  if (staffError) {
    await admin.auth.admin.deleteUser(userResult.user.id);
    await admin.from("businesses").delete().eq("id", business.id);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: business.id,
    name,
    owner: { name: ownerName, phone: ownerPhone },
  });
}
