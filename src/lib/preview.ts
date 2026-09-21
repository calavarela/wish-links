import * as cheerio from "cheerio";
import type { LinkPreview } from "./types";
import { canonicalizeUrl, faviconFor, getDomain, isPubliclyFetchable } from "./url";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SOCIAL_CRAWLER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const MAX_HTML_BYTES = 1_500_000;
const TIMEOUT_MS = 9000;

/** Moneda probable según el dominio, cuando la página no la declara. */
function currencyFromDomain(domain: string): string {
  if (/\.ar$/.test(domain)) return "ARS";
  if (/\.br$/.test(domain)) return "BRL";
  if (/\.(uk|co\.uk)$/.test(domain)) return "GBP";
  if (/\.(es|fr|de|it|pt|nl|eu)$/.test(domain)) return "EUR";
  if (/\.(cl)$/.test(domain)) return "CLP";
  if (/\.(mx)$/.test(domain)) return "MXN";
  if (/\.(uy)$/.test(domain)) return "UYU";
  return "ARS";
}

/** Entiende tanto "12.990,50" (es-AR) como "12,990.50" (en-US). */
export function parsePrice(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // El separador decimal es el que aparece más a la derecha.
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized = decimals === 3 ? cleaned.split(",").join("") : cleaned.replace(",", ".");
  } else if (lastDot !== -1) {
    const decimals = cleaned.length - lastDot - 1;
    normalized = decimals === 3 ? cleaned.split(".").join("") : cleaned;
  } else {
    normalized = cleaned;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function absolute(src: string | undefined, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/** Recorre el JSON-LD buscando un nodo de tipo Product/Offer. */
function findProductNode(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || depth > 6) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProductNode(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => typeof t === "string" && /product|offer/i.test(t))) {
      return obj;
    }
    for (const key of ["@graph", "mainEntity", "itemListElement", "hasVariant"]) {
      const found = findProductNode(obj[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8").decode(merged);
}

function emptyPreview(rawUrl: string): LinkPreview {
  return {
    url: rawUrl,
    canonicalUrl: canonicalizeUrl(rawUrl),
    domain: getDomain(rawUrl),
    siteName: null,
    title: null,
    description: null,
    imageUrl: null,
    faviconUrl: faviconFor(rawUrl),
    priceAmount: null,
    priceCurrency: null,
    blocked: true,
  };
}

async function fetchHtml(
  rawUrl: string,
  userAgent: string,
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetch(rawUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) return null;
    if (!(response.headers.get("content-type") ?? "").includes("html")) return null;

    const html = await readCapped(response);
    return html ? { html, finalUrl: response.url || rawUrl } : null;
  } catch {
    return null;
  }
}

/**
 * Varias tiendas (Amazon, Zara, Mercado Libre) rechazan a un navegador headless
 * pero sí le sirven las etiquetas Open Graph al crawler de las redes sociales,
 * que es justo lo que necesitamos.
 */
export async function fetchPreview(rawUrl: string): Promise<LinkPreview> {
  if (!isPubliclyFetchable(rawUrl)) return emptyPreview(rawUrl);

  const withBrowser = await fetchHtml(rawUrl, BROWSER_UA);
  let preview = withBrowser ? parseHtml(withBrowser.html, rawUrl, withBrowser.finalUrl) : null;

  if (!preview || preview.blocked) {
    const withCrawler = await fetchHtml(rawUrl, SOCIAL_CRAWLER_UA);
    const retry = withCrawler ? parseHtml(withCrawler.html, rawUrl, withCrawler.finalUrl) : null;
    if (retry && !retry.blocked) preview = retry;
  }

  return preview ?? emptyPreview(rawUrl);
}

function parseHtml(html: string, requestedUrl: string, finalUrl: string): LinkPreview {
  const domain = getDomain(requestedUrl);

  // Si el sitio nos mandó a otro host (muro anti-bot, login, captcha), ese link
  // no sirve: el producto sigue siendo el que pegó la usuaria.
  const sameHost = getDomain(finalUrl) === domain;
  const baseUrl = sameHost ? finalUrl : requestedUrl;

  const $ = cheerio.load(html);
  const meta = (selector: string) => $(selector).attr("content")?.trim() || undefined;

  // 1. Open Graph / Twitter Cards: lo que usan WhatsApp y las redes.
  let title =
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    $("title").first().text().trim() ??
    undefined;

  let description =
    meta('meta[property="og:description"]') ??
    meta('meta[name="twitter:description"]') ??
    meta('meta[name="description"]');

  let image =
    meta('meta[property="og:image:secure_url"]') ??
    meta('meta[property="og:image"]') ??
    meta('meta[name="twitter:image"]') ??
    meta('meta[name="twitter:image:src"]') ??
    $('link[rel="image_src"]').attr("href") ??
    undefined;

  const siteName = meta('meta[property="og:site_name"]') ?? null;

  let price = parsePrice(
    meta('meta[property="product:price:amount"]') ??
      meta('meta[property="og:price:amount"]') ??
      meta('meta[itemprop="price"]') ??
      $('[itemprop="price"]').first().attr("content") ??
      undefined,
  );

  let currency =
    meta('meta[property="product:price:currency"]') ??
    meta('meta[property="og:price:currency"]') ??
    meta('meta[itemprop="priceCurrency"]') ??
    $('[itemprop="priceCurrency"]').first().attr("content") ??
    undefined;

  // 2. JSON-LD: de acá sale el precio en la mayoría de los e-commerce.
  $('script[type="application/ld+json"]').each((_, el) => {
    if (price !== null && title && image) return;
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const node = findProductNode(JSON.parse(raw));
      if (!node) return;

      if (!title && typeof node.name === "string") title = node.name;
      if (!description && typeof node.description === "string") description = node.description;

      if (!image) {
        const img = node.image;
        if (typeof img === "string") image = img;
        else if (Array.isArray(img) && typeof img[0] === "string") image = img[0];
        else if (img && typeof img === "object") {
          const urlProp = (img as Record<string, unknown>).url;
          if (typeof urlProp === "string") image = urlProp;
        }
      }

      const offersRaw = node.offers ?? node;
      const offer = (Array.isArray(offersRaw) ? offersRaw[0] : offersRaw) as
        | Record<string, unknown>
        | undefined;
      if (offer) {
        if (price === null) price = parsePrice(offer.price ?? offer.lowPrice ?? offer.highPrice);
        if (!currency && typeof offer.priceCurrency === "string") currency = offer.priceCurrency;
      }
    } catch {
      // JSON-LD roto: se ignora y seguimos con el resto.
    }
  });

  // El canonical solo se acepta si apunta al mismo sitio.
  const canonicalHref = absolute($('link[rel="canonical"]').attr("href"), baseUrl);
  const canonicalSource =
    canonicalHref && getDomain(canonicalHref) === domain ? canonicalHref : baseUrl;

  const resolvedImage = absolute(image, baseUrl);
  const cleanTitle = title?.replace(/\s+/g, " ").trim() || null;

  return {
    url: baseUrl,
    canonicalUrl: canonicalizeUrl(canonicalSource),
    domain,
    siteName: siteName || null,
    title: cleanTitle,
    description: description?.replace(/\s+/g, " ").trim().slice(0, 400) || null,
    imageUrl: resolvedImage,
    faviconUrl: faviconFor(baseUrl),
    priceAmount: price,
    priceCurrency: price !== null ? (currency?.toUpperCase() ?? currencyFromDomain(domain)) : null,
    // Sin host propio no hubo página real: se completa a mano.
    blocked: !sameHost || (!cleanTitle && !resolvedImage),
  };
}
