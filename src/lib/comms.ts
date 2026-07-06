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

// Nigerian local numbers -> E.164 (+234…). Returns null if it can't be normalised.
export function toE164Nigeria(phone: string): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.startsWith("234")) return "+" + d;
  if (d.startsWith("0")) return "+234" + d.slice(1);
  if (d.length === 10) return "+234" + d; // e.g. 8032210098
  return null;
}
