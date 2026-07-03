import { createClient } from "@/lib/supabase/server";
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

      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-muted">
          Logged in as <span className="font-medium text-teal-700">{staff?.role}</span>. Order
          Management is next.
        </p>
      </main>
    </div>
  );
}
