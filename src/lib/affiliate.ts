/**
 * Convierte el link de la tienda en link de afiliado justo antes de redirigir
 * (ver /go/[id]). En la base queda siempre el link original, así se puede
 * cambiar de programa sin tocar los datos.
 *
 * Cada regla se activa con su variable de entorno; sin ella, el link sale igual.
 *
 * Si el link ya trae la atribución de otro afiliado (la persona lo copió de un
 * creador, de un blog, de un cupón), se respeta tal cual: Wish Links no pisa
 * ni agrega su código. Ver `foreignAttribution`.
 */

type AffiliateRule = {
  name: string;
  matches: (url: URL) => boolean;
  /** true si el link ya lleva nuestro propio código (no es atribución ajena). */
  isOurs?: (url: URL) => boolean;
  apply: (url: URL) => URL | null;
};

const AMAZON_HOST = /(^|\.)amazon\.[a-z.]+$/i;

const RULES: AffiliateRule[] = [
  {
    // Amazon Associates: el código va en `tag`. Cada marketplace tiene su propio
    // programa, así que por ahora solo se toca amazon.com.
    name: "amazon",
    matches: (url) => /^(www\.)?amazon\.com$/i.test(url.hostname),
    isOurs: (url) => {
      const tag = process.env.AMAZON_ASSOCIATE_TAG;
      return Boolean(tag) && url.searchParams.get("tag") === tag;
    },
    apply: (url) => {
      const tag = process.env.AMAZON_ASSOCIATE_TAG;
      if (!tag) return null;
      url.searchParams.set("tag", tag);
      return url;
    },
  },
  // Mercado Libre: sus links de afiliado se generan desde el panel del programa.
  // Cuando se sepa el formato (o haya API), la regla va acá.
];

/**
 * Parámetros que indican que el link ya viene atribuido a un afiliado. Se
 * eligen los inequívocos: `ref` o `source` quedan afuera porque las tiendas los
 * usan para navegación interna y harían que nunca se aplique el programa propio.
 */
const ATTRIBUTION_PARAMS: { network: string; test: (key: string, url: URL) => boolean }[] = [
  // Amazon Associates (cualquier marketplace).
  { network: "amazon", test: (key, url) => key === "tag" && AMAZON_HOST.test(url.hostname) },
  // Programa de afiliados de Mercado Libre: matt_tool, matt_word, matt_source, matt_campaign...
  { network: "mercadolibre", test: (key) => /^matt_/i.test(key) },
  // Redes de afiliación.
  { network: "awin", test: (key) => /^awc$/i.test(key) },
  { network: "impact", test: (key) => /^(irclickid|irgwc)$/i.test(key) },
  { network: "cj", test: (key) => /^cjevent$/i.test(key) },
  { network: "rakuten", test: (key) => /^(ranmid|raneaid|ransiteid)$/i.test(key) },
  { network: "partnerize", test: (key) => /^clickref$/i.test(key) },
  { network: "shareasale", test: (key) => /^sscid$/i.test(key) },
  // Nombres genéricos que usan programas propios de las tiendas.
  {
    network: "generic",
    test: (key) => /^(aff|affid|aff_id|affiliate|affiliate_id|affiliateid|afid|aff_sub|partner_id|partnerid)$/i.test(key),
  },
];

/**
 * Red del afiliado que ya figura en el link, o null si no tiene. Si el código
 * es el nuestro (`isOurs`), no cuenta como ajeno.
 */
export function foreignAttribution(url: URL): string | null {
  for (const rule of RULES) {
    if (rule.matches(url) && rule.isOurs?.(url)) return null;
  }
  for (const key of url.searchParams.keys()) {
    if (!url.searchParams.get(key)) continue; // `?tag=` vacío no atribuye nada
    const found = ATTRIBUTION_PARAMS.find((param) => param.test(key, url));
    if (found) return found.network;
  }
  return null;
}

export function toAffiliateUrl(raw: string): { url: string; program: string | null; preserved: string | null } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: raw, program: null, preserved: null };
  }

  // Comisión de otra persona: el link sale exactamente como estaba guardado.
  const preserved = foreignAttribution(url);
  if (preserved) return { url: raw, program: null, preserved };

  for (const rule of RULES) {
    if (!rule.matches(url)) continue;
    const converted = rule.apply(new URL(url));
    if (converted) return { url: converted.toString(), program: rule.name, preserved: null };
  }
  return { url: url.toString(), program: null, preserved: null };
}
