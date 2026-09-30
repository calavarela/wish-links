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

const MERCADO_LIBRE_HOST = /(^|\.)mercadoli[bv]re\./i;

/**
 * La app de Mercado Libre comparte un link de verificación que lleva el
 * producto real en `go`. Sin desenvolverlo, todos los productos se ven iguales.
 */
function unwrapMercadoLibre(url: URL): URL {
  if (!MERCADO_LIBRE_HOST.test(url.hostname) || !url.pathname.startsWith("/gz/account-verification")) {
    return url;
  }
  const target = url.searchParams.get("go");
  if (!target) return url;
  try {
    const inner = new URL(target);
    return MERCADO_LIBRE_HOST.test(inner.hostname) && /^https?:$/.test(inner.protocol) ? inner : url;
  } catch {
    return url;
  }
}

export function normalizeUrlInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = unwrapMercadoLibre(new URL(withScheme));
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

/**
 * Un item es de la tienda si comparten dominio o uno es subdominio del otro
 * (ej: articulo.mercadolibre.com.ar y mercadolibre.com.ar).
 */
export function isSameStore(itemDomain: string | null, storeDomain: string): boolean {
  if (!itemDomain) return false;
  const a = itemDomain.toLowerCase();
  const b = storeDomain.toLowerCase();
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

/** Subdominios de sección, no de tienda: articulo.mercadolibre.com.ar es Mercado Libre. */
const SECTION_SUBDOMAINS = new Set(["www", "m", "articulo", "listado", "produto", "lista", "shop", "tienda", "store"]);
/** Plataformas donde cada tienda es un subdominio: ahí el nombre es el primer label. */
const STORE_PLATFORMS = /\.(mitiendanube\.com|myshopify\.com|empretienda\.com\.ar|tiendanegocio\.com)$/i;
const TLD_LABELS = new Set(["com", "net", "org", "co", "ar", "br", "mx", "cl", "uy", "es", "us", "uk", "io", "app", "shop", "store"]);

/** Acortadores y links de compartir: el dominio no es el de la tienda. */
const LINK_SHORTENERS = new Set(["share.google", "a.co", "amzn.to", "bit.ly", "t.co", "tinyurl.com", "meli.la", "linktr.ee", "l.instagram.com"]);

export function isStoreDomain(domain: string | null): domain is string {
  return Boolean(domain && domain.includes(".") && !LINK_SHORTENERS.has(domain.toLowerCase()));
}

/** Dominio con el que se guarda una tienda: sin www ni subdominios de sección. */
export function storeDomain(url: string): string {
  const labels = getDomain(url).toLowerCase().split(".");
  while (labels.length > 2 && SECTION_SUBDOMAINS.has(labels[0])) labels.shift();
  return labels.join(".");
}

/** Nombre de respaldo cuando la tienda no declara uno: "tricot.com.ar" → "Tricot". */
export function storeNameFromDomain(domain: string): string {
  const labels = domain.toLowerCase().split(".");
  let label: string | undefined;
  if (STORE_PLATFORMS.test(domain)) {
    label = labels[0];
  } else {
    while (labels.length > 1 && TLD_LABELS.has(labels[labels.length - 1])) labels.pop();
    label = labels[labels.length - 1];
  }
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : domain;
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
