"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type State = { status: "idle" | "connecting" | "connected"; qr?: string | null; error?: string | null; number?: string | null };

export function WhatsAppConnect({ defaultNumber }: { defaultNumber: string }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [number, setNumber] = useState(defaultNumber);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const r = (await fetch("/api/whatsapp/state").then((x) => x.json()).catch(() => null)) as State | null;
    if (r) setState(r);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (state.status === "connecting") {
      poll.current = setInterval(refresh, 2500);
      return () => { if (poll.current) clearInterval(poll.current); };
    }
  }, [state.status, refresh]);

  useEffect(() => {
    if (state.qr) QRCode.toDataURL(state.qr, { width: 240, margin: 1 }).then(setQrSrc).catch(() => setQrSrc(null));
    else setQrSrc(null);
  }, [state.qr]);

  async function connect() {
    setBusy(true);
    const r = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: number }),
    }).then((x) => x.json()).catch(() => ({ error: "Could not start" }));
    setBusy(false);
    if (r.error) { setState((s) => ({ ...s, status: "connecting", error: r.error })); return; }
    setState({ status: "connecting", qr: null });
    refresh();
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/whatsapp/disconnect", { method: "POST" }).catch(() => {});
    setBusy(false);
    setState({ status: "idle" });
    setQrSrc(null);
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Your WhatsApp</p>
      <p className="mb-3 text-[11px] text-muted-2">Messages to customers go out from your own number</p>

      {state.status === "connected" ? (
        <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <div>
            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-green-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
              Connected
            </p>
            <p className="font-mono text-xs text-muted">{state.number}</p>
          </div>
          <button type="button" onClick={disconnect} disabled={busy} className="h-9 rounded-lg bg-white/50 px-3 text-xs font-medium text-red-500 disabled:opacity-60">Disconnect</button>
        </div>
      ) : state.status === "connecting" ? (
        <div className="flex flex-col items-center gap-3">
          {qrSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="WhatsApp QR" className="h-56 w-56 rounded-xl bg-white p-2" />
              <div className="text-center text-xs text-muted">
                <p className="font-medium text-ink">Scan with WhatsApp</p>
                <p className="mt-1">Open WhatsApp → <b>Linked Devices</b> → <b>Link a device</b> → scan this code.</p>
              </div>
            </>
          ) : state.error ? (
            <p className="rounded-lg bg-red-500/5 px-3 py-2 text-center text-sm text-red-500">{state.error}</p>
          ) : (
            <p className="py-8 text-sm text-muted">Preparing your code…</p>
          )}
          <button type="button" onClick={disconnect} disabled={busy} className="text-xs font-medium text-muted">Cancel</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            placeholder="Your WhatsApp number (e.g. 0803…)"
            className="h-11 w-full rounded-lg border border-white/60 bg-white/40 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
          <button type="button" onClick={connect} disabled={busy || !number.trim()} className="btn-primary h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Starting…" : "Connect my WhatsApp"}
          </button>
          {state.error && <p className="text-xs text-red-500">{state.error}</p>}
        </div>
      )}
    </div>
  );
}
