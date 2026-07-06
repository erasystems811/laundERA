"use client";

import { useState, useTransition } from "react";
import { changePin } from "./actions";

export function ChangePin() {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    if (pin.trim().length < 4) { setMsg({ ok: false, text: "PIN must be at least 4 digits." }); return; }
    if (pin !== confirm) { setMsg({ ok: false, text: "The two PINs don't match." }); return; }
    startTransition(async () => {
      try {
        await changePin(pin);
        setMsg({ ok: true, text: "PIN changed ✓" });
        setPin(""); setConfirm("");
      } catch (e) {
        setMsg({ ok: false, text: (e as Error).message });
      }
    });
  }

  const input = "h-11 w-full rounded-lg border border-white/60 bg-white/40 px-3 text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500";

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Login PIN</p>
      <p className="mb-3 text-[11px] text-muted-2">Change the PIN you log in with</p>
      <div className="flex flex-col gap-2">
        <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" type="password" placeholder="New PIN" className={input} />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} inputMode="numeric" type="password" placeholder="Confirm new PIN" className={input} />
        {msg && <p className={`text-xs ${msg.ok ? "text-teal-700" : "text-red-500"}`}>{msg.text}</p>}
        <button type="button" onClick={save} disabled={isPending || !pin || !confirm} className="btn-primary h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : "Change PIN"}
        </button>
      </div>
    </div>
  );
}
