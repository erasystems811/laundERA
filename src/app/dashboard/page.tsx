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
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-zinc-500">{business?.name ?? "LaundERA"}</p>
          <p className="text-lg font-semibold text-zinc-900">Welcome, {staff?.name}</p>
        </div>
        <form action={logOut}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Log out
          </button>
        </form>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-zinc-500">
          Logged in as <span className="font-medium text-zinc-900">{staff?.role}</span>. Order
          Management is next.
        </p>
      </main>
    </div>
  );
}
