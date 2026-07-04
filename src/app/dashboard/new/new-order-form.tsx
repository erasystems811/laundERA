"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ServiceIcon } from "@/components/service-icon";
import { formatNaira } from "@/lib/format";
import { createOrder, searchCustomers, uploadOrderPhoto, type CustomerHit } from "./actions";

type Service = { id: string; name: string; icon: string; price: number };

export function NewOrderForm({ services, hasCustomers }: { services: Service[]; hasCustomers: boolean }) {
  const [addingNew, setAddingNew] = useState(!hasCustomers);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHit | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPrefs, setNewPrefs] = useState("");
  const [droppedBy, setDroppedBy] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const customerId = selectedCustomer?.id ?? null;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced customer search — only fetches matches, never the whole table.
  useEffect(() => {
    if (addingNew || selectedCustomer) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const hits = await searchCustomers(query);
      setResults(hits);
      setSearching(false);
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, addingNew, selectedCustomer]);

  const subtotal = useMemo(
    () => services.reduce((sum, s) => sum + (quantities[s.id] ?? 0) * Number(s.price), 0),
    [services, quantities]
  );
  const discountAmount = useMemo(() => {
    const v = Number(discountValue) || 0;
    if (v <= 0) return 0;
    const amt = discountType === "percentage" ? (subtotal * v) / 100 : v;
    return Math.min(amt, subtotal);
  }, [discountType, discountValue, subtotal]);
  const total = subtotal - discountAmount;

  function bump(id: string, delta: number) {
    setQuantities((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) + delta) }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo is too large — keep it under 5MB.");
      return;
    }
    const fd = new FormData();
    fd.set("photo", file);
    setUploadingPhoto(true);
    setError(null);
    startTransition(async () => {
      try {
        const url = await uploadOrderPhoto(fd);
        setPhotos((p) => [...p, url]);
      } catch {
        setError("Photo upload failed. Try again.");
      } finally {
        setUploadingPhoto(false);
        if (photoRef.current) photoRef.current.value = "";
      }
    });
  }

  function pickCustomer(c: CustomerHit) {
    setSelectedCustomer(c);
    setResults([]);
    setQuery("");
    if (!droppedBy) setDroppedBy(c.name);
  }

  function submit() {
    setError(null);
    const items = Object.entries(quantities).filter(([, q]) => q > 0).map(([serviceId, quantity]) => ({ serviceId, quantity }));
    const droppedName = droppedBy.trim() || (addingNew ? newName : selectedCustomer?.name ?? "");
    if (!customerId && !(addingNew && newName && newPhone)) return setError("Choose or add a customer first.");
    if (!items.length) return setError("Add at least one item.");

    startTransition(async () => {
      try {
        await createOrder({
          customerId: addingNew ? null : customerId,
          newCustomer: addingNew ? { name: newName, phone: newPhone, preferences: newPrefs } : null,
          items,
          discount: Number(discountValue) > 0 ? { type: discountType, value: Number(discountValue) } : null,
          droppedOffBy: droppedName,
          photos,
        });
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-white/60 bg-white/40 px-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Left: customer + items */}
      <div className="flex flex-col gap-5 lg:col-span-2">
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</p>
            <button
              type="button"
              onClick={() => { setAddingNew((v) => !v); setSelectedCustomer(null); setQuery(""); setResults([]); }}
              className="text-sm font-semibold text-teal-700"
            >
              {addingNew ? "← Choose existing" : "+ New customer"}
            </button>
          </div>

          {addingNew ? (
            <div className="flex flex-col gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer name" className={inputCls} />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} inputMode="numeric" placeholder="Phone number" className={inputCls} />
              <textarea value={newPrefs} onChange={(e) => setNewPrefs(e.target.value)} rows={2} placeholder="Care preferences (e.g. no starch, fold don't hang)" className="w-full resize-none rounded-xl border border-white/60 bg-white/40 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
            </div>
          ) : selectedCustomer ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted">{selectedCustomer.phone}</p>
                </div>
                <button type="button" onClick={() => setSelectedCustomer(null)} className="text-sm font-medium text-teal-700">
                  Change
                </button>
              </div>
              {selectedCustomer.preferences && (
                <div className="mt-3 rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Care preference</p>
                  <p className="mt-0.5 text-sm text-ink">{selectedCustomer.preferences}</p>
                </div>
              )}
            </>
          ) : (
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or phone…"
                className={inputCls}
                autoComplete="off"
              />
              {query.trim().length >= 2 && (
                <div className="mt-2 flex flex-col gap-1 rounded-xl border border-white/60 bg-white/50 p-1 backdrop-blur">
                  {searching && <p className="px-3 py-2 text-sm text-muted">Searching…</p>}
                  {!searching && results.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted">No match. Use “+ New customer” above.</p>
                  )}
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-white/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">{c.name}</p>
                        <p className="text-xs text-muted">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Tap to add items</p>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {services.map((s) => {
              const qty = quantities[s.id] ?? 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => bump(s.id, 1)}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-semibold transition-colors ${qty > 0 ? "border-teal-500 bg-teal-500/10 text-teal-900" : "border-white/60 bg-white/25 text-ink"}`}
                >
                  <ServiceIcon icon={s.icon} className="h-6 w-6" />
                  <span>{s.name}</span>
                  <span className="text-[10px] font-normal text-muted">{formatNaira(Number(s.price))}</span>
                  {qty > 0 && (
                    <>
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 font-mono text-xs text-white shadow">{qty}</span>
                      <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); bump(s.id, -1); }} className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white text-ink shadow">−</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Photos of the clothes</p>
              <p className="text-[11px] text-muted-2">Snap the clothes so there&rsquo;s a clear record</p>
            </div>
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/60 bg-white/40 px-4 text-sm font-medium text-ink hover:bg-white/60 disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {uploadingPhoto ? "Uploading…" : "Snap / add"}
            </button>
          </div>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Clothes" className="h-20 w-20 rounded-xl object-cover" />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((u) => u !== url))} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white text-ink shadow">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: summary */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <div className="glass-card rounded-2xl p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Dropped off by</label>
          <input value={droppedBy} onChange={(e) => setDroppedBy(e.target.value)} placeholder="Who brought the clothes?" className={inputCls} />

          {!discountOpen ? (
            <button type="button" onClick={() => setDiscountOpen(true)} className="mt-4 text-sm font-medium text-teal-700">+ Add discount</button>
          ) : (
            <div className="mt-4 flex gap-2">
              <div className="flex overflow-hidden rounded-lg border border-white/60">
                <button type="button" onClick={() => setDiscountType("percentage")} className={`px-3 text-sm font-medium ${discountType === "percentage" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>% off</button>
                <button type="button" onClick={() => setDiscountType("fixed")} className={`px-3 text-sm font-medium ${discountType === "fixed" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>₦ off</button>
              </div>
              <div className="relative flex-1">
                {discountType === "fixed" && <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[15px] text-muted">₦</span>}
                <input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  inputMode="numeric"
                  placeholder={discountType === "percentage" ? "10" : "500"}
                  className={`h-10 w-full rounded-lg border border-white/60 bg-white/40 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500 ${discountType === "fixed" ? "pl-7 pr-3" : "pl-3 pr-8"}`}
                />
                {discountType === "percentage" && <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[15px] text-muted">%</span>}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-1.5 border-t border-ink/10 pt-4 text-sm">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-muted"><span>Subtotal</span><span className="font-mono tabular-nums">{formatNaira(subtotal)}</span></div>
                <div className="flex justify-between text-teal-700"><span>Discount</span><span className="font-mono tabular-nums">−{formatNaira(discountAmount)}</span></div>
              </>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-muted">Total</span>
              <span className="font-mono text-2xl font-bold tabular-nums text-teal-900">{formatNaira(total)}</span>
            </div>
          </div>

          {error && <p className="mt-3 rounded-xl bg-red-50/80 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button type="button" disabled={isPending} onClick={submit} className="btn-primary mt-4 h-14 w-full rounded-2xl text-lg font-medium text-white disabled:opacity-60">
            {isPending ? "Creating…" : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
