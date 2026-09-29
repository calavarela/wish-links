/**
 * Convierte el link de la tienda en link de afiliado justo antes de redirigir
 * (ver /go/[id]). En la base queda siempre el link original, así se puede
 * cambiar de programa sin tocar los datos.
 *
 * Cada regla se activa con su variable de entorno; sin ella, el link sale igual.
 */

type AffiliateRule = {
  name: string;
  matches: (url: URL) => boolean;
  apply: (url: URL) => URL | null;
};

const RULES: AffiliateRule[] = [
  {
    // Amazon Associates: el código va en `tag`. Cada marketplace tiene su propio
    // programa, así que por ahora solo se toca amazon.com.
    name: "amazon",
    matches: (url) => /^(www\.)?amazon\.com$/i.test(url.hostname),
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

export function toAffiliateUrl(raw: string): { url: string; program: string | null } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: raw, program: null };
  }

  for (const rule of RULES) {
    if (!rule.matches(url)) continue;
    const converted = rule.apply(new URL(url));
    if (converted) return { url: converted.toString(), program: rule.name };
  }
  return { url: url.toString(), program: null };
}
