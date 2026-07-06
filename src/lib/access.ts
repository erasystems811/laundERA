// A business is read-only if manually paused OR past its access expiry date.
// Mirrors the RLS auth_business_active() gate so the UI matches what the DB enforces.
export function isBusinessReadOnly(
  b: { status: string; expires_at: string | null } | null | undefined
): boolean {
  if (!b) return false;
  const today = new Date().toISOString().slice(0, 10);
  return b.status === "paused" || (!!b.expires_at && today >= b.expires_at);
}
