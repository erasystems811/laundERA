const PATHS: Record<string, string> = {
  shirt: "M8 3l4 2 4-2 3 4-3 2v11H5V9L2 7l3-4z",
  trouser: "M7 3h10l1 5-2 1-1 12H9L8 9l-2-1 1-5z",
  bedsheet: "M3 12h18M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2",
  duvet: "M12 3c-3 3-6 6-6 10a6 6 0 0012 0c0-4-3-7-6-10z",
  agbada: "M6 3l3 3 3-2 3 2 3-3 1 6-4 2v10H6V11L2 9l4-6z",
};

export function ServiceIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon === "bedsheet") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="8" width="18" height="10" rx="2" />
        <path d={PATHS.bedsheet} />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d={PATHS[icon] ?? PATHS.shirt} />
    </svg>
  );
}
