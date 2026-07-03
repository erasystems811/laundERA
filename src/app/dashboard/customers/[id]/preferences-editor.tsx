"use client";

import { useState, useTransition } from "react";
import { savePreferences } from "./actions";

export function PreferencesEditor({
  customerId,
  initial,
}: {
  customerId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = value !== initial;

  function handleSave() {
    startTransition(async () => {
      await savePreferences(customerId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Care preferences
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="e.g. No starch on shirts. Fold, don't hang."
        className="w-full resize-none rounded-xl border border-white/60 bg-white/40 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
      />
      {(dirty || saved) && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="btn-primary mt-3 h-11 w-full rounded-xl text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save preferences"}
        </button>
      )}
    </div>
  );
}
