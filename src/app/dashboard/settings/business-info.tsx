"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { updateBusiness, uploadLogo } from "./actions";

export function BusinessInfo({
  initialName,
  initialWhatsapp,
  initialAddress,
  initialFooter,
  logoUrl,
}: {
  initialName: string;
  initialWhatsapp: string;
  initialAddress: string;
  initialFooter: string;
  logoUrl: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [address, setAddress] = useState(initialAddress);
  const [footer, setFooter] = useState(initialFooter);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== initialName ||
    whatsapp !== initialWhatsapp ||
    address !== initialAddress ||
    footer !== initialFooter;

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await updateBusiness({
        name: name.trim(),
        whatsapp_number: whatsapp.trim(),
        address: address.trim(),
        invoice_footer: footer.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("logo", file);
    setUploading(true);
    startTransition(async () => {
      try {
        await uploadLogo(fd);
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Business & invoice details
      </p>

      {/* Logo */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/40">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={64} height={64} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-2">No logo</span>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-10 rounded-xl border border-white/60 bg-white/40 px-4 text-sm font-medium text-ink hover:bg-white/60 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
          </button>
          <p className="mt-1 text-[11px] text-muted-2">Shows on every invoice</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
      </div>

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
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address (shows on invoice)"
          className="h-11 rounded-lg border border-white/60 bg-white/40 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
        />
        <input
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Invoice note (e.g. Thank you for your patronage)"
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
