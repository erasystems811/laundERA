// Thin client for ERA Comms (WhatsApp send). Secrets come from env, never hardcoded.
const COMMS_URL = process.env.COMMS_API_URL || "https://era-comms-api-production.up.railway.app";

export type CommsResult = { id?: string; conversationId?: string; status?: string; idempotent?: boolean };

export async function sendWhatsApp(input: {
  to: string;
  content: string;
  sessionId: string;
  idempotencyKey?: string;
}): Promise<CommsResult> {
  const key = process.env.COMMS_API_KEY;
  if (!key) throw new Error("COMMS_API_KEY not set");

  const res = await fetch(`${COMMS_URL}/v1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify({
      sessionId: input.sessionId,
      to: input.to,
      content: input.content,
      idempotencyKey: input.idempotencyKey,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as CommsResult & { error?: string; message?: string };
  if (!res.ok) throw new Error(data.message || data.error || `Comms error ${res.status}`);
  return data;
}

function commsHeaders() {
  const key = process.env.COMMS_API_KEY;
  if (!key) throw new Error("COMMS_API_KEY not set");
  return { "Content-Type": "application/json", "X-API-Key": key };
}

// Create a WhatsApp session (one connected number) for a laundry. Returns the session id.
export async function createCommsSession(phoneNumber: string): Promise<string> {
  const res = await fetch(`${COMMS_URL}/v1/sessions`, {
    method: "POST",
    headers: commsHeaders(),
    body: JSON.stringify({ phoneNumber, role: "primary" }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; message?: string };
  if (!res.ok || !data.id) throw new Error(data.message || data.error || `Comms session error ${res.status}`);
  return data.id;
}

// connected | disconnected (the only two values the client API exposes).
export async function getCommsSessionStatus(sessionId: string): Promise<string> {
  const res = await fetch(`${COMMS_URL}/v1/sessions/${sessionId}`, { headers: commsHeaders(), cache: "no-store" });
  if (!res.ok) return "disconnected";
  const data = (await res.json().catch(() => ({}))) as { status?: string };
  return data.status || "disconnected";
}

export async function deleteCommsSession(sessionId: string): Promise<void> {
  await fetch(`${COMMS_URL}/v1/sessions/${sessionId}`, { method: "DELETE", headers: commsHeaders() }).catch(() => {});
}

// Request an 8-char pairing code (alternative to QR). Session must be running.
export async function requestPairingCode(sessionId: string, phoneNumber: string): Promise<string> {
  const res = await fetch(`${COMMS_URL}/v1/sessions/${sessionId}/pairing-code`, {
    method: "POST",
    headers: commsHeaders(),
    body: JSON.stringify({ phoneNumber }),
  });
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string; message?: string };
  if (!res.ok || !data.code) throw new Error(data.message || data.error || `Comms pairing error ${res.status}`);
  return data.code;
}

export function commsWsUrl(sessionId: string): string {
  const key = process.env.COMMS_API_KEY;
  const ws = COMMS_URL.replace(/^http/, "ws");
  return `${ws}/v1/sessions/${sessionId}/qr?api_key=${key}`;
}

// Nigerian local numbers -> E.164 (+234…). Returns null if it can't be normalised.
export function toE164Nigeria(phone: string): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.startsWith("234")) return "+" + d;
  if (d.startsWith("0")) return "+234" + d.slice(1);
  if (d.length === 10) return "+234" + d; // e.g. 8032210098
  return null;
}
