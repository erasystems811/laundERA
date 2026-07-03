import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/tab-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let paused = false;
  if (user) {
    const { data: staff } = await supabase
      .from("staff")
      .select("businesses(status)")
      .eq("id", user.id)
      .single();
    const business = staff?.businesses as unknown as { status: string } | null;
    paused = business?.status === "paused";
  }

  return (
    <div className="flex flex-1 flex-col">
      {paused && (
        <div className="sticky top-0 z-50 bg-amber-500/90 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur">
          Your account is paused — view only. Please contact ERA Systems.
        </div>
      )}
      {children}
      <TabBar />
    </div>
  );
}
