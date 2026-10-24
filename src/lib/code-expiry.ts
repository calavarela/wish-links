import type { DiscountCode } from "./types";
import { isSameStore } from "./url";

// Aparte de discount-codes.ts para que el cliente no arrastre cheerio.

/**
 * Códigos de la tienda de un item: vigentes primero (manuales antes que
 * detectados) y, si se piden, los vencidos al final.
 */
export function codesForDomain(
  codes: DiscountCode[],
  domain: string | null,
  { includeExpired = false } = {},
): DiscountCode[] {
  const today = todayInArgentina();
  const rank = (c: DiscountCode) => (isExpired(c, today) ? 2 : 0) + (c.source === "manual" ? 0 : 1);
  return codes
    .filter((c) => isSameStore(domain, c.domain) && (includeExpired || !isExpired(c, today)))
    .sort((a, b) => rank(a) - rank(b));
}

const TIME_ZONE = "America/Argentina/Buenos_Aires";

/**
 * Hoy en Argentina (YYYY-MM-DD). El servidor corre en UTC: con su fecha, un
 * código que vence hoy dejaría de verse a las 21 h.
 */
export function todayInArgentina(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

export const isExpired = (code: Pick<DiscountCode, "expires_on">, today = todayInArgentina()) =>
  code.expires_on !== null && code.expires_on < today;

/** Días enteros entre dos fechas YYYY-MM-DD. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Horas que faltan para la medianoche de Argentina (UTC-3, sin horario de verano). */
function hoursLeftToday(now: Date): number {
  const argentinaNow = new Date(now.getTime() - 3 * 3_600_000);
  return 24 - argentinaNow.getUTCHours();
}

/**
 * Cuánto le queda a un código: "Vencido", "Vence hoy · quedan 5 h",
 * "Vence mañana", "Quedan 12 días" o la fecha si falta más de un mes.
 */
export function expiryLabel(expiresOn: string, now = new Date()): { text: string; expired: boolean; soon: boolean } {
  const days = daysBetween(todayInArgentina(now), expiresOn);
  if (days < 0) return { text: "Vencido", expired: true, soon: false };
  if (days === 0) return { text: `Vence hoy · quedan ${hoursLeftToday(now)} h`, expired: false, soon: true };
  if (days === 1) return { text: "Vence mañana", expired: false, soon: true };
  if (days <= 30) return { text: `Quedan ${days} días`, expired: false, soon: days <= 3 };
  const date = new Date(`${expiresOn}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  return { text: `Vence el ${date}`, expired: false, soon: false };
}
