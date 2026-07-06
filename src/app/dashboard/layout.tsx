import { createClient } from "@/lib/supabase/server";
import { isBusinessReadOnly } from "@/lib/access";
import { Shell } from "@/components/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businessName = "LaundERA";
  let staffName = "";
  let paused = false;

  if (user) {
    const { data: staff } = await supabase
      .from("staff")
      .select("name, businesses(name, status, expires_at)")
      .eq("id", user.id)
      .single();
    const business = staff?.businesses as unknown as { name: string; status: string; expires_at: string | null } | null;
    businessName = business?.name || "LaundERA";
    staffName = staff?.name ?? "";
    paused = isBusinessReadOnly(business);
  }

  return (
    <Shell
      businessName={businessName}
      staffName={staffName}
      paused={paused}
      logo={<span className="text-sm font-bold">{businessName.slice(0, 1).toUpperCase()}</span>}
    >
      {children}
    </Shell>
  );
}
