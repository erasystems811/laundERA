import WebSocket from "ws";
import { commsWsUrl } from "@/lib/comms";
import { createAdminClient } from "@/lib/supabase/admin";

// A per-session relay: LaundERA's server holds the Comms WebSocket (which carries the
// Comms secret) and keeps the latest QR in memory. The laundry's browser polls our own
// endpoint for the QR string — the secret never reaches the browser.
type Entry = { qr: string | null; connected: boolean; error: string | null; ws: WebSocket | null; startedAt: number };

const g = globalThis as unknown as { __waRelays?: Map<string, Entry> };
const relays: Map<string, Entry> = g.__waRelays ?? new Map();
g.__waRelays = relays;

const MAX_MS = 3 * 60 * 1000; // stop trying after 3 minutes

export function getRelayState(sessionId: string): { qr: string | null; connected: boolean; error: string | null } | null {
  const e = relays.get(sessionId);
  return e ? { qr: e.qr, connected: e.connected, error: e.error } : null;
}

export function ensureRelay(sessionId: string, businessId: string): void {
  const existing = relays.get(sessionId);
  if (existing && (existing.connected || existing.ws)) return; // done or already live
  const entry: Entry = { qr: null, connected: false, error: null, ws: null, startedAt: Date.now() };
  relays.set(sessionId, entry);
  open(sessionId, businessId, entry);
}

export function dropRelay(sessionId: string): void {
  const e = relays.get(sessionId);
  if (e?.ws) try { e.ws.close(); } catch {}
  relays.delete(sessionId);
}

function open(sessionId: string, businessId: string, e: Entry): void {
  let ws: WebSocket;
  try {
    ws = new WebSocket(commsWsUrl(sessionId));
  } catch (err) {
    e.error = (err as Error).message;
    return;
  }
  e.ws = ws;
  const timer = setTimeout(() => { try { ws.close(); } catch {} }, MAX_MS);

  ws.on("message", async (raw: WebSocket.RawData) => {
    let msg: { type?: string; code?: string; reason?: string };
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "qr") {
      e.qr = msg.code ?? null;
      e.error = null;
    } else if (msg.type === "connected") {
      e.connected = true;
      e.qr = null;
      try {
        await createAdminClient().from("businesses").update({ comms_connected: true }).eq("id", businessId);
      } catch {}
      clearTimeout(timer);
      try { ws.close(); } catch {}
    } else if (msg.type === "error") {
      e.error = msg.reason || "Could not connect";
    } else if (msg.type === "logged_out") {
      e.error = "WhatsApp logged out — try again";
      e.qr = null;
    }
  });

  ws.on("close", () => { clearTimeout(timer); e.ws = null; });
  ws.on("error", (err: Error) => { e.error = err.message; e.ws = null; });
}
