import { TabBar } from "@/components/tab-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      {children}
      <TabBar />
    </div>
  );
}
