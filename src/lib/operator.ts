import { NextRequest } from "next/server";

// Guards the operator/admin API. Only ERA Hub, holding OPERATOR_SECRET, can call these routes.
export function isOperator(req: NextRequest): boolean {
  const secret = process.env.OPERATOR_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-operator-secret");
  return Boolean(provided) && provided === secret;
}

export function phoneToLoginEmail(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return `${normalized}@staff.laundera.app`;
}
