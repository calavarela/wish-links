import { NextResponse, type NextRequest } from "next/server";
import { fetchPreview } from "@/lib/preview";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LinkPreview } from "@/lib/types";

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

  const queue = [...(items as PendingItem[])];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await check(item).catch(() => {});
      }
    }),
  );

  return NextResponse.json({ checked: items.length, changed, promos });
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
