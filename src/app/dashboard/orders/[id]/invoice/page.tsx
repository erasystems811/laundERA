import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PrintButton } from "./print-button";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, total, subtotal, discount_value, created_at, customers(name, phone), businesses(name)")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_number, created_at")
    .eq("order_id", id)
    .single();

  if (!invoice) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, service_name, quantity, unit_price")
    .eq("order_id", id);

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("order_id", id);

  const customer = order.customers as unknown as { name: string; phone: string } | null;
  const business = order.businesses as unknown as { name: string } | null;
  const total = Number(order.total);
  const subtotal = Number(order.subtotal);
  const discount = subtotal - total;
  const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = total - paid;

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 print:block print:px-0 print:py-0">
      <div className="mb-6 flex w-full max-w-xl justify-between print:hidden">
        <Link href={`/dashboard/orders/${id}`} className="text-sm font-medium text-teal-700">
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="glass-card w-full max-w-xl rounded-3xl p-8 print:rounded-none print:border-none print:bg-white print:shadow-none">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xl font-semibold tracking-tight text-teal-900">{business?.name}</p>
            <p className="text-sm text-muted">Invoice {invoice.invoice_number}</p>
          </div>
          <p className="text-sm text-muted">
            {new Date(invoice.created_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Billed to</p>
          <p className="text-[15px] font-medium text-ink">{customer?.name}</p>
          <p className="text-sm text-muted">{customer?.phone}</p>
        </div>

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
            <span>Balance due</span>
            <span className="font-mono tabular-nums">{formatNaira(balance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
