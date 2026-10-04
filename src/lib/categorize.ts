import type { Category } from "./types";

/**
 * Sugerencia de categoría a partir del título (y la descripción) de un
 * producto. Sin red ni IA: un diccionario de palabras por tipo de categoría
 * más lo que se aprende de los títulos que la usuaria ya categorizó. Si no hay
 * una ganadora clara, no sugiere nada.
 */

/** Palabras que identifican cada tipo de categoría, ya sin acentos y en minúscula. */
const CONCEPTS: { names: string[]; words: string[] }[] = [
  {
    names: ["ropa", "indumentaria", "moda", "vestimenta", "outfit", "calzado", "zapatos", "accesorios"],
    words: [
      "blazer", "saco", "pantalon", "jean", "jeans", "denim", "remera", "camiseta", "musculosa", "top", "blusa",
      "camisa", "chaleco", "campera", "abrigo", "tapado", "sweater", "sueter", "buzo", "hoodie", "cardigan",
      "vestido", "pollera", "falda", "short", "bermuda", "calza", "legging", "jogger", "mono", "enterito",
      "corpino", "bombacha", "less", "boxer", "lenceria", "bikini", "malla", "pijama", "medias", "body",
      "zapatilla", "zapatillas", "zapato", "zapatos", "sandalia", "sandalias", "zueco", "zuecos", "bota",
      "botas", "botineta", "mocasin", "ojota", "ojotas", "chinela", "aros", "aro", "collar", "pulsera", "anillo",
      "cartera", "bolso", "mochila", "rinonera", "cinturon", "gorra", "sombrero", "bufanda", "pashmina",
      "anteojos", "lentes", "sastrero", "broderie", "lino", "tejido", "polar",
    ],
  },
  {
    names: ["tecno", "tecnologia", "electronica", "gadgets", "tech", "computacion"],
    words: [
      "tv", "televisor", "smart", "led", "monitor", "notebook", "laptop", "pc", "computadora", "celular",
      "iphone", "samsung", "motorola", "xiaomi", "tablet", "ipad", "auricular", "auriculares", "airpods",
      "parlante", "bluetooth", "mouse", "teclado", "cargador", "cable", "usb", "hdmi", "consola", "playstation",
      "ps5", "xbox", "nintendo", "joystick", "camara", "smartwatch", "reloj", "kindle", "router", "disco",
      "pendrive", "impresora", "proyector", "alexa", "chromecast", "gamer", "ssd", "ram",
    ],
  },
  {
    names: ["casa", "hogar", "deco", "decoracion", "cocina", "bano", "living", "jardin", "muebles"],
    words: [
      "griferia", "canilla", "cocina", "mesada", "bacha", "vajilla", "plato", "platos", "vaso", "vasos", "taza",
      "tazas", "cuchara", "cucharita", "cucharitas", "tenedor", "cuchillo", "olla", "sarten", "fuente", "jarra",
      "mate", "termo", "sillon", "sofa", "silla", "mesa", "mesita", "escritorio", "estante", "estanteria",
      "rack", "lampara", "velador", "luz", "almohadon", "almohada", "sabana", "sabanas", "acolchado", "frazada",
      "manta", "toalla", "toallon", "alfombra", "cortina", "espejo", "cuadro", "florero", "maceta", "planta",
      "plantas", "bambu", "orquidea", "flor", "flores", "vela", "velas", "difusor", "organizador", "canasto",
      "colchon", "cama", "respaldo", "perchero", "placard", "bano", "ducha", "jabonera", "aspiradora",
      "cafetera", "licuadora", "pava", "tostadora", "microondas", "heladera", "horno",
    ],
  },
  {
    names: ["belleza", "beauty", "cuidado", "skincare", "maquillaje", "perfumes"],
    words: [
      "perfume", "crema", "serum", "maquillaje", "labial", "rimel", "base", "shampoo", "acondicionador",
      "protector", "solar", "esmalte", "skincare", "mascara", "corrector", "rubor", "iluminador", "secador",
      "planchita", "rizador",
    ],
  },
  {
    names: ["deporte", "deportes", "fitness", "gym", "entrenamiento", "outdoor"],
    words: [
      "pelota", "raqueta", "mancuerna", "mancuernas", "yoga", "colchoneta", "bicicleta", "bici", "running",
      "pesas", "camping", "carpa", "botella", "guantes",
    ],
  },
  {
    names: ["escritorio", "oficina", "trabajo", "estudio", "libreria", "papeleria"],
    words: [
      "portafolio", "portanotebook", "maletin", "agenda", "cuaderno", "libreta", "lapicera", "lapiz", "resaltador",
      "carpeta", "planner", "calendario", "silla", "escritorio", "organizador",
    ],
  },
  {
    names: ["libros", "lectura"],
    words: ["libro", "libros", "novela", "kindle", "ebook", "comic", "manga"],
  },
  {
    names: ["mascotas", "perro", "gato"],
    words: ["perro", "gato", "mascota", "collar", "correa", "cucha", "rascador", "alimento", "balanceado"],
  },
];

/** Palabras que no dicen nada del tipo de producto. */
const STOPWORDS = new Set([
  "para", "con", "sin", "de", "del", "la", "el", "los", "las", "y", "en", "por", "x", "un", "una", "mujer",
  "hombre", "unisex", "nino", "nina", "pack", "set", "kit", "nuevo", "nueva", "color", "negro", "negra",
  "blanco", "blanca", "azul", "rojo", "beige", "gris", "verde", "rosa", "marron", "chocolate", "store", "tienda",
  "oficial", "envio", "gratis", "oferta", "talle", "mercado", "libre", "argentina", "arg", "regalo",
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
}

export function tokens(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word));
}

/** El nombre de una categoría sin emoji ni acentos: "🏠 Casa" → "casa". */
const categoryKey = (category: Pick<Category, "name">) => normalizeText(category.name).trim();

export type CategorizedTitle = { title: string | null; category_id: string | null };

/**
 * Elige una categoría o devuelve null. Puntaje por categoría:
 * - 3 si el nombre de la categoría aparece en el texto ("set de escritorio" → Escritorio)
 * - 2 por cada palabra del diccionario del tipo de categoría
 * - 1 por cada palabra que ya apareció en títulos de esa categoría (lo aprendido)
 * Gana solo si llega a 2 y le saca ventaja a la segunda.
 */
export function suggestCategory(
  text: { title: string | null; description?: string | null },
  categories: Pick<Category, "id" | "name">[],
  history: CategorizedTitle[] = [],
): string | null {
  if (categories.length === 0) return null;

  // El título pesa entero; de la descripción solo las primeras palabras (suele traer ruido).
  const titleWords = new Set(tokens(text.title ?? ""));
  const descriptionWords = new Set(tokens(text.description ?? "").slice(0, 25));
  if (titleWords.size === 0 && descriptionWords.size === 0) return null;
  const hit = (word: string) => (titleWords.has(word) ? 1 : descriptionWords.has(word) ? 0.5 : 0);

  const learned = new Map<string, Set<string>>();
  for (const item of history) {
    if (!item.category_id || !item.title) continue;
    const words = learned.get(item.category_id) ?? new Set<string>();
    for (const word of tokens(item.title)) if (word.length >= 3) words.add(word);
    learned.set(item.category_id, words);
  }

  const scores = categories.map((category) => {
    const key = categoryKey(category);
    let score = 0;

    if (key && key.split(/\s+/).every((part) => titleWords.has(part))) score += 3;

    const concept = CONCEPTS.find((c) => c.names.some((name) => key === name || key.split(/\s+/).includes(name)));
    if (concept) for (const word of concept.words) score += 2 * hit(word);

    for (const word of learned.get(category.id) ?? []) score += hit(word);

    return { id: category.id, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  if (!best || best.score < 2) return null;
  if (second && best.score - second.score < 1) return null;
  return best.id;
}
