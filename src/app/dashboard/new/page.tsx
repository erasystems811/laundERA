import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewOrderForm } from "./new-order-form";

export default async function NewOrderPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, icon, price")
    .eq("active", true)
    .order("name");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("name");

  return (
    <div className="flex flex-1 flex-col">
      <header className="glass-card mx-4 mt-4 flex items-center gap-3 rounded-3xl px-6 py-4 sm:mx-6 sm:mt-6">
        <Link href="/dashboard" className="text-xl text-teal-700">
          ←
        </Link>
        <p className="text-lg font-semibold tracking-tight text-teal-900">New Order</p>
      </header>

      <NewOrderForm services={services ?? []} customers={customers ?? []} />
    </div>
  );
}
