export function phoneToLoginEmail(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return `${normalized}@staff.laundera.app`;
}
