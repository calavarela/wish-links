import * as cheerio from "cheerio";
import { isExpired, todayInArgentina } from "./code-expiry";
import type { DiscountCode } from "./types";
import { isSameStore } from "./url";

export type DetectedCode = { code: string; description: string | null };

// "código", "cupón", "code" y variantes, seguido opcionalmente de "de descuento" y separadores.
const MENTION =
  /(?:c[oó]digo|cup[oó]n|code)(?:\s+de\s+descuento)?(?:\s+de\s+regalo)?\s*[:：\-–]?\s*["“'«]?([A-Za-z0-9][A-Za-z0-9_-]{2,19})["”'»]?/giu;

/**
 * Palabras en mayúscula que aparecen en banners pero no son códigos
 * ("CUPÓN REGALO", "CÓDIGO POSTAL", "CUPÓN DE DESCUENTO: VER MÁS").
 */
const NOT_CODES = new Set([
  "REGALO", "DESCUENTO", "POSTAL", "VER", "MAS", "MÁS", "AQUI", "AQUÍ", "ACA", "ACÁ", "EXCLUSIVO", "EXCLUSIVA",
  "VALIDO", "VÁLIDO", "GRATIS", "ENVIO", "ENVÍO", "OFF", "PROMO", "PROMOCION", "PROMOCIÓN", "APLICAR", "INGRESAR",
  "INGRESA", "USANDO", "USA", "CON", "PARA", "TODA", "TODO", "TODOS", "COMPRA", "COMPRAS", "TIENDA", "ONLINE",
  "WEB", "NUEVO", "NUEVA", "CLIENTE", "CLIENTES", "PRIMERA", "SUSCRIBITE", "NEWSLETTER", "ACTIVO", "VIGENTE",
]);

/** Un código real está en mayúsculas y o tiene un número (HOLA10) o es una palabra que no es de banner. */
function looksLikeCode(token: string): boolean {
  if (token !== token.toUpperCase()) return false;
  if (!/[A-Z]/.test(token)) return false;
  if (NOT_CODES.has(token)) return false;
  return /\d/.test(token) || token.length >= 5;
}

/** "15% OFF", "20% de descuento", "$5.000 de descuento", "envío gratis" cerca de la mención. */
function describe(context: string): string | null {
  const pct = context.match(/(\d{1,2})\s*%\s*(off|de\s+descuento|dto)?/i);
  if (pct) return `${pct[1]}% OFF`;
  const amount = context.match(/\$\s?([\d.]{3,})\s*(?:de\s+descuento|off)/i);
  if (amount) return `$${amount[1]} de descuento`;
  if (/env[ií]o\s+gratis/i.test(context)) return "Envío gratis";
  return null;
}

/**
 * Busca códigos de descuento en el texto visible de una página (barra de
 * anuncios, banners). Es estricto a propósito: mejor no encontrar nada que
 * mostrar un código inventado.
 */
export function detectCodes(html: string): DetectedCode[] {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, form, input, select, textarea").remove();
  const text = $("body").text().replace(/\s+/g, " ");

  const found = new Map<string, DetectedCode>();
  for (const match of text.matchAll(MENTION)) {
    const token = match[1];
    if (!looksLikeCode(token) || found.has(token)) continue;
    const start = Math.max(0, (match.index ?? 0) - 80);
    const context = text.slice(start, (match.index ?? 0) + match[0].length + 80);
    found.set(token, { code: token, description: describe(context) });
    if (found.size >= 5) break;
  }
  return [...found.values()];
}

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
