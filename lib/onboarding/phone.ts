export function formatParentPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  if (phone.trim().startsWith("+")) {
    return phone.trim();
  }
  return digits ? `+${digits}` : phone.trim();
}

export function formatSendTimeLabel(value: string | null | undefined): string {
  const [hourText = "7", minute = "30"] = (value ?? "07:30").split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.slice(0, 2)} ${suffix}`;
}

export function toWhatsAppAddress(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.toLowerCase().startsWith("whatsapp:")) {
    return trimmed;
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  return `whatsapp:+${digits}`;
}
