import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectCodes } from "@/lib/discount-codes";
import { fetchPageHtml, fetchPreview } from "@/lib/preview";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DiscountCode, LinkPreview } from "@/lib/types";
import { isStoreDomain, storeDomain } from "@/lib/url";

// Cada página puede tardar hasta ~18 s (dos intentos), así que se revisa en tandas.
export const maxDuration = 300;

const BATCH_SIZE = 60;
const CONCURRENCY = 6;

type PendingItem = {
  id: string;
  url: string;
  price_amount: number | null;
  price_currency: string | null;
};

/**
 * Chequeo diario de precios (Vercel Cron, ver vercel.json). Revisa primero los
 * items pendientes que hace más tiempo no se miran. Si el precio cambió lo
 * actualiza y guarda el anterior para la etiqueta de %; el historial lo
 * escribe el trigger de `items`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { data: items, error } = await supabase
    .from("items")
    .select("id, url, price_amount, price_currency")
    .eq("status", "pending")
    .order("price_checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // El mismo producto puede estar en varias listas: se lee una sola vez.
  const previews = new Map<string, Promise<LinkPreview>>();
  let changed = 0;
  let promos = 0;

  async function check(item: PendingItem) {
    if (!previews.has(item.url)) previews.set(item.url, fetchPreview(item.url));
    const preview = await previews.get(item.url)!;
    const update = priceUpdate(item, preview);
    if (update) changed++;
    const promo = promoUpdate(item, preview, update?.price_amount ?? item.price_amount);
    if (promo?.list_price_amount) promos++;

    await supabase!
      .from("items")
      .update({ ...update, ...promo, price_checked_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  await inPool(items as PendingItem[], check);
  const codes = await syncDetectedCodes(supabase);

  return NextResponse.json({ checked: items.length, changed, promos, ...codes });
}

/** Corre `task` sobre todos los elementos, de a CONCURRENCY a la vez. Un error no corta el resto. */
async function inPool<T>(list: T[], task: (value: T) => Promise<void>) {
  const queue = [...list];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let value = queue.shift(); value !== undefined; value = queue.shift()) {
        await task(value).catch(() => {});
      }
    }),
  );
}

/**
 * Busca códigos de descuento en la página principal de cada tienda que alguien
 * tiene en su lista (productos pendientes o favoritas). Los detectados se
 * renuevan en cada lectura buena y se borran si dejan de aparecer; los que
 * cargó la usuaria no se tocan nunca.
 */
async function syncDetectedCodes(supabase: SupabaseClient) {
  const [{ data: items }, { data: stores }, { data: existing }] = await Promise.all([
    supabase.from("items").select("user_id, url").eq("status", "pending"),
    supabase.from("stores").select("user_id, domain"),
    supabase.from("discount_codes").select("id, user_id, domain, code, source"),
  ]);

  // dominio de tienda → usuarias que lo tienen
  const owners = new Map<string, Set<string>>();
  const add = (domain: string, userId: string) => {
    if (!isStoreDomain(domain)) return;
    if (!owners.has(domain)) owners.set(domain, new Set());
    owners.get(domain)!.add(userId);
  };
  for (const item of items ?? []) add(storeDomain(item.url), item.user_id);
  for (const store of stores ?? []) add(store.domain, store.user_id);

  const codes = (existing ?? []) as (Pick<DiscountCode, "id" | "domain" | "code" | "source"> & { user_id: string })[];
  let detected = 0;

  await inPool([...owners.keys()], async (domain) => {
    const html = await fetchPageHtml(`https://${domain}`);
    if (html === null) return; // Sin lectura no se borra nada: puede ser un error pasajero.
    const found = detectCodes(html);
    detected += found.length;
    const now = new Date().toISOString();

    for (const userId of owners.get(domain)!) {
      const mine = codes.filter((c) => c.user_id === userId && c.domain === domain);
      for (const { code, description } of found) {
        const current = mine.find((c) => c.code === code);
        if (current?.source === "manual") continue;
        if (current) {
          await supabase.from("discount_codes").update({ description, detected_at: now }).eq("id", current.id);
        } else {
          await supabase
            .from("discount_codes")
            .insert({ user_id: userId, domain, code, description, source: "detected", detected_at: now });
        }
      }
      const gone = mine.filter((c) => c.source === "detected" && !found.some((f) => f.code === c.code));
      if (gone.length) await supabase.from("discount_codes").delete().in("id", gone.map((c) => c.id));
    }
  });

  return { stores_checked: owners.size, codes_detected: detected };
}

/**
 * El precio de lista se reescribe en cada lectura buena, así una promo que
 * terminó queda en null. Si la página no se pudo leer, no se toca.
 */
function promoUpdate(item: PendingItem, preview: LinkPreview, price: number | null) {
  if (preview.blocked || preview.priceAmount === null) return null;
  if (item.price_currency && preview.priceCurrency && item.price_currency !== preview.priceCurrency) return null;

  const list = preview.listPriceAmount;
  return { list_price_amount: list !== null && price !== null && list > Number(price) ? list : null };
}

/** Los campos a cambiar, o null si el precio sigue igual o no se pudo leer. */
function priceUpdate(item: PendingItem, preview: LinkPreview) {
  const amount = preview.priceAmount;
  if (preview.blocked || amount === null || amount <= 0) return null;

  // Sin cotización no se puede comparar entre monedas: se deja como está.
  if (item.price_currency && preview.priceCurrency && item.price_currency !== preview.priceCurrency) return null;
  if (item.price_amount !== null && Number(item.price_amount) === amount) return null;

  return {
    price_amount: amount,
    price_currency: item.price_currency ?? preview.priceCurrency,
    previous_price_amount: item.price_amount,
  };
}
