import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOperator } from "@/lib/operator";

// GET /api/admin/businesses/:id/notifications — the laundry's WhatsApp automation log.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isOperator(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notifications")
    .select("id, recipient, content, status, error, created_at")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const failed = rows.filter((n) => n.status === "failed").length;

  return NextResponse.json({
    notifications: rows,
    summary: { total: rows.length, sent: rows.length - failed, failed },
  });
}
