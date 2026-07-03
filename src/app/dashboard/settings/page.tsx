import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { logOut } from "../actions";
import { ServicesManager } from "./services-manager";
import { BusinessInfo } from "./business-info";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("name, business_id, businesses(name, whatsapp_number)")
    .eq("id", user!.id)
    .single();

  const business = staff?.businesses as unknown as {
    name: string;
    whatsapp_number: string | null;
  } | null;

  const { data: services } = await supabase
    .from("services")
    .select("id, name, icon, price, active")
    .order("name");

  return (
    <div className="flex flex-1 flex-col pb-28">
      <PageHeader title="Settings" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-4 sm:px-6">
        <ServicesManager services={services ?? []} />

        <BusinessInfo
          initialName={business?.name ?? ""}
          initialWhatsapp={business?.whatsapp_number ?? ""}
        />

        <div className="glass-card flex items-center justify-between rounded-2xl px-5 py-4">
          <div>
            <p className="text-[15px] font-medium text-ink">{staff?.name}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
          <form action={logOut}>
            <button
              type="submit"
              className="h-10 rounded-xl border border-white/60 bg-white/40 px-4 text-sm font-medium text-ink hover:bg-white/60"
            >
              Log out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
