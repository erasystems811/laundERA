// LaundERA wordmark — "ERA" tied visually to ERA Systems.

export function Wordmark({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`font-semibold tracking-tight text-teal-900 ${text} ${className}`}>
      Laund<span className="text-teal-500">ERA</span>
    </span>
  );
}

// Small "from ERA Systems" credit line for the app footer and print documents.
export function BrandCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] text-muted-2 ${className}`}>
      <span className="font-semibold text-teal-700">Laund<span className="text-teal-500">ERA</span></span>
      <span className="text-muted-2"> — from ERA Systems</span>
    </p>
  );
}
