"use client";

import { useState, useTransition } from "react";
import { setNotifyOnReady } from "./actions";

export function NotifySettings({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await setNotifyOnReady(next);
      } catch {
        setOn(!next); // revert on failure
      }
    });
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Notifications</p>
      <p className="mb-3 text-[11px] text-muted-2">Keep customers informed automatically</p>

      <button type="button" onClick={toggle} disabled={isPending} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/30 p-3 text-left">
        <span>
          <span className="block text-[15px] font-semibold text-ink">WhatsApp when ready</span>
          <span className="block text-xs text-muted">Message the customer the moment their clothes are marked Ready.</span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-teal-500" : "bg-ink/20"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </span>
      </button>
    </div>
  );
}
