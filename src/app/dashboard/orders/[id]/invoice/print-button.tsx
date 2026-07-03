"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-ink"
    >
      Print / Save PDF
    </button>
  );
}
