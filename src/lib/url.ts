/** Parámetros de tracking que no cambian el producto al que apunta el link. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^gbraid$/i,
  /^wbraid$/i,
  /^msclkid$/i,
  /^mc_(cid|eid)$/i,
  /^igshid$/i,
  /^igsh$/i,
  /^si$/i,
  /^srsltid$/i,
  /^_gl$/i,
  /^ref$/i,
  /^ref_$/i,
  /^ref_src$/i,
  /^referrer$/i,
  /^source$/i,
  /^spm$/i,
  /^tracking_id$/i,
  /^pd_rd_/i,
  /^psc$/i,
  /^th$/i,
  /^sr$/i,
  /^qid$/i,
  /^keywords$/i,
  /^sprefix$/i,
  /^crid$/i,
  /^dib/i,
  /^content-id$/i,
  /^cv_ct_/i,
  /^smid$/i,
  /^linkCode$/i,
  /^tag$/i,
  /^ascsubtag$/i,
];

export function normalizeUrlInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Saca del texto compartido (ej: desde Instagram) la primera URL que encuentre. */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function faviconFor(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/**
 * Versión estable del link: sin tracking ni hash, para detectar duplicados
 * aunque el mismo producto se comparta desde lugares distintos.
 */
export function canonicalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./i, "");

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) {
      url.searchParams.delete(key);
    }
  }

  // Amazon: /dp/<ASIN> identifica al producto, el resto del path es ruido.
  const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (/(^|\.)amazon\./i.test(url.hostname) && asin) {
    url.pathname = `/dp/${asin[1].toUpperCase()}`;
    url.search = "";
  }

  // Mercado Libre repite el id del producto en el path; la query es tracking.
  if (/(^|\.)mercadolibre\./i.test(url.hostname) || /(^|\.)mercadolivre\./i.test(url.hostname)) {
    url.search = "";
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

/** Bloquea direcciones internas para que /api/preview no sea un proxy hacia la red privada. */
export function isPubliclyFetchable(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host === "0.0.0.0" || host === "[::1]" || host === "::1") return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (host.startsWith("[fc") || host.startsWith("[fd") || host.startsWith("[fe80")) return false;

  return true;
}
