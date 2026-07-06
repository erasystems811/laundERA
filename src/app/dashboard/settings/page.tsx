import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { logOut } from "../actions";
import { ServicesManager } from "./services-manager";
import { BusinessInfo } from "./business-info";
import { MonthlyCosts } from "./monthly-costs";
import { PaymentAccount } from "./payment-account";
import { NotifySettings } from "./notify-settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("name, business_id, businesses(name, whatsapp_number, address, invoice_footer, logo_url, payment_method, bank_name, account_number, account_name, notify_on_ready)")
    .eq("id", user!.id)
    .single();

  const business = staff?.businesses as unknown as {
    name: string;
    whatsapp_number: string | null;
    address: string | null;
    invoice_footer: string | null;
    logo_url: string | null;
    payment_method: "manual" | "listen" | "flutterwave";
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
    notify_on_ready: boolean;
  } | null;

  const { data: services } = await supabase
    .from("services")
    .select("id, name, icon, price, active")
    .order("name");

  const { data: costs } = await supabase
    .from("expenses")
    .select("id, name, amount, cadence")
    .eq("kind", "recurring")
    .order("created_at", { ascending: false });
  const recurring = (costs ?? []).map((c) => ({ ...c, amount: Number(c.amount) }));

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your services, prices, and branding" />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ServicesManager services={services ?? []} />
          <MonthlyCosts recurring={recurring} />
        </div>

        <div className="flex flex-col gap-5">
          <BusinessInfo
            initialName={business?.name ?? ""}
            initialWhatsapp={business?.whatsapp_number ?? ""}
            initialAddress={business?.address ?? ""}
            initialFooter={business?.invoice_footer ?? ""}
            logoUrl={business?.logo_url ?? null}
          />

          <PaymentAccount
            initialMethod={business?.payment_method ?? "manual"}
            initialBank={business?.bank_name ?? ""}
            initialNumber={business?.account_number ?? ""}
            initialAccountName={business?.account_name ?? ""}
          />

          <NotifySettings initial={business?.notify_on_ready ?? false} />

          <div className="glass-card flex items-center justify-between rounded-2xl px-5 py-4">
            <div>
              <p className="text-[15px] font-medium text-ink">{staff?.name}</p>
              <p className="text-xs text-muted">Signed in</p>
            </div>
            <form action={logOut}>
              <button type="submit" className="h-10 rounded-xl border border-white/60 bg-white/40 px-4 text-sm font-medium text-ink hover:bg-white/60">
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
