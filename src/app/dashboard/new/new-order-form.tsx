"use client";

import { useMemo, useState, useTransition } from "react";
import { ServiceIcon } from "@/components/service-icon";
import { formatNaira } from "@/lib/format";
import { createOrder } from "./actions";

type Service = { id: string; name: string; icon: string; price: number };
type Customer = { id: string; name: string; phone: string };

export function NewOrderForm({
  services,
  customers,
}: {
  services: Service[];
  customers: Customer[];
}) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(customers.length === 0);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () =>
      services.reduce((sum, s) => sum + (quantities[s.id] ?? 0) * Number(s.price), 0),
    [services, quantities]
  );

  function bump(serviceId: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[serviceId] ?? 0) + delta);
      return { ...prev, [serviceId]: next };
    });
  }

  function handleSubmit() {
    setError(null);

    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([serviceId, quantity]) => ({ serviceId, quantity }));

    if (!customerId && !(addingNew && newName && newPhone)) {
      setError("Choose or add a customer first.");
      return;
    }
    if (!items.length) {
      setError("Add at least one item.");
      return;
    }

    startTransition(async () => {
      try {
        await createOrder({
          customerId: addingNew ? null : customerId,
          newCustomer: addingNew ? { name: newName, phone: newPhone } : null,
          items,
        });
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 pt-6 sm:px-6">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Customer
        </p>

        {!addingNew && (
          <div className="glass-card mb-3 flex flex-col gap-1 rounded-2xl p-2">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCustomerId(c.id)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                  customerId === c.id ? "bg-teal-500/15" : "hover:bg-white/40"
                }`}
              >
                <div>
                  <p className="text-[15px] font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c.phone}</p>
                </div>
                {customerId === c.id && (
                  <svg
                    className="h-5 w-5 text-teal-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setAddingNew((v) => !v);
            setCustomerId(null);
          }}
          className="mb-6 text-sm font-medium text-teal-700"
        >
          {addingNew ? "← Choose existing customer" : "+ Add new customer"}
        </button>

        {addingNew && (
          <div className="glass-card mb-6 flex flex-col gap-3 rounded-2xl p-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Customer name"
              className="h-12 w-full rounded-xl border border-white/60 bg-white/40 px-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              inputMode="numeric"
              placeholder="Phone number"
              className="h-12 w-full rounded-xl border border-white/60 bg-white/40 px-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
            />
          </div>
        )}

        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Tap to add items
        </p>
        <div className="mb-6 grid grid-cols-3 gap-2.5">
          {services.map((s) => {
            const qty = quantities[s.id] ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => bump(s.id, 1)}
                className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-semibold transition-colors ${
                  qty > 0
                    ? "border-teal-500 bg-teal-500/10 text-teal-900"
                    : "border-white/60 bg-white/25 text-ink"
                }`}
              >
                <ServiceIcon icon={s.icon} className="h-6 w-6" />
                <span>{s.name}</span>
                <span className="text-[10px] font-normal text-muted">
                  {formatNaira(Number(s.price))}
                </span>
                {qty > 0 && (
                  <>
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 font-mono text-xs text-white shadow">
                      {qty}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        bump(s.id, -1);
                      }}
                      className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white text-ink shadow"
                    >
                      −
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="glass-card flex items-baseline justify-between rounded-2xl px-5 py-4">
          <span className="text-sm text-muted">Total</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-teal-900">
            {formatNaira(total)}
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50/80 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
      </div>

      <div className="fixed inset-x-4 bottom-4 mx-auto max-w-2xl sm:inset-x-6">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="btn-primary h-14 w-full rounded-2xl text-lg font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create Order"}
        </button>
      </div>
    </div>
  );
}
