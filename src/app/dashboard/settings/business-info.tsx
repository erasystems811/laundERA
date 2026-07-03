"use client";

import { useState, useTransition } from "react";
import { updateBusiness } from "./actions";

export function BusinessInfo({
  initialName,
  initialWhatsapp,
}: {
  initialName: string;
  initialWhatsapp: string;
}) {
  const [name, setName] = useState(initialName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = name !== initialName || whatsapp !== initialWhatsapp;

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await updateBusiness({ name: name.trim(), whatsapp_number: whatsapp.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Business</p>
      <div className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Business name"
          className="h-11 rounded-lg border border-white/60 bg-white/40 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          inputMode="tel"
          placeholder="WhatsApp number"
          className="h-11 rounded-lg border border-white/60 bg-white/40 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
        />
      </div>
      {(dirty || saved) && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="btn-primary mt-3 h-11 w-full rounded-lg text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      )}
    </div>
  );
}
