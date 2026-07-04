"use client";

import { useState, useTransition } from "react";
import { savePaymentAccount } from "./actions";

type Method = "manual" | "listen" | "flutterwave";

export function PaymentAccount({
  initialMethod,
  initialBank,
  initialNumber,
  initialAccountName,
}: {
  initialMethod: Method;
  initialBank: string;
  initialNumber: string;
  initialAccountName: string;
}) {
  const [method, setMethod] = useState<Method>(initialMethod);
  const [bank, setBank] = useState(initialBank);
  const [number, setNumber] = useState(initialNumber);
  const [accountName, setAccountName] = useState(initialAccountName);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty =
    method !== initialMethod ||
    bank !== initialBank ||
    number !== initialNumber ||
    accountName !== initialAccountName;

  function handleSave() {
    startTransition(async () => {
      await savePaymentAccount({ method, bank_name: bank, account_number: number, account_name: accountName });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  const input = "h-11 w-full rounded-lg border border-white/60 bg-white/40 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500";

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Payments</p>
      <p className="mb-3 text-[11px] text-muted-2">How your customers pay you</p>

      <div className="mb-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMethod("listen")}
          className={`rounded-xl border p-3 text-left ${method === "listen" ? "border-teal-500 bg-teal-500/10" : "border-white/60 bg-white/30"}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-ink">My account</p>
            <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Auto-collect coming</span>
          </div>
          <p className="text-xs text-muted">Your account number shows on every invoice so customers pay you directly. Automatic detection (Flutterwave) is being set up.</p>
        </button>
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className={`rounded-xl border p-3 text-left ${method === "manual" ? "border-teal-500 bg-teal-500/10" : "border-white/60 bg-white/30"}`}
        >
          <p className="text-[15px] font-semibold text-ink">Manual (fallback)</p>
          <p className="text-xs text-muted">Record cash and transfers yourself. No account shown.</p>
        </button>
      </div>

      {method === "listen" && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Account to show on invoices</p>
          <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank (e.g. Moniepoint, GTBank)" className={input} />
          <input value={number} onChange={(e) => setNumber(e.target.value)} inputMode="numeric" placeholder="Account number" className={input} />
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className={input} />
        </div>
      )}

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
