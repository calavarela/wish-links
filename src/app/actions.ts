"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, type ItemStatus, type PurchaseSource } from "@/lib/types";
import { fetchPreview } from "@/lib/preview";
import {
  canonicalizeUrl,
  faviconFor,
  getDomain,
  isPubliclyFetchable,
  isStoreDomain,
  normalizeUrlInput,
  storeDomain,
  storeNameFromDomain,
} from "@/lib/url";

/** `ok` se usa en el cliente para saber cuÃ¡ndo cerrar el diÃ¡logo; `saved` alimenta analytics. */
export type ActionState = {
  error: string | null;
  ok?: boolean;
  saved?: { domain: string; has_price: boolean; has_category: boolean };
  store?: { domain: string };
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Los items y las tiendas se ven en la lista, en /tiendas y en cada página de
 * tienda: revalidar solo "/" dejaría las otras desactualizadas.
 */
function revalidateLists() {
  revalidatePath("/");
  revalidatePath("/tiendas");
  revalidatePath("/tiendas/[domain]", "page");
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Copia la imagen al Storage propio. Si la tienda despuÃ©s borra el producto o
 * bloquea el hotlinking, la tarjeta se sigue viendo igual.
 */
async function storeImage(
  supabase: SupabaseClient,
  userId: string,
  source: { file?: File | null; remoteUrl?: string | null },
): Promise<string | null> {
  let bytes: ArrayBuffer | null = null;
  let contentType: string | null = null;

  if (source.file && source.file.size > 0) {
    if (source.file.size > MAX_IMAGE_BYTES) return null;
    if (!EXTENSIONS[source.file.type]) return null;
    bytes = await source.file.arrayBuffer();
    contentType = source.file.type;
  } else if (source.remoteUrl && isPubliclyFetchable(source.remoteUrl)) {
    try {
      const response = await fetch(source.remoteUrl, {
        signal: AbortSignal.timeout(9000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WishLinks/1.0)" },
      });
      if (!response.ok) return source.remoteUrl;
      const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!EXTENSIONS[type]) return source.remoteUrl;
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return source.remoteUrl;
      bytes = buffer;
      contentType = type;
    } catch {
      // Si no se pudo copiar, al menos queda el link original a la imagen.
      return source.remoteUrl;
    }
  }

  if (!bytes || !contentType) return null;

  const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const { error } = await supabase.storage.from("previews").upload(path, bytes, {
    contentType,
    cacheControl: "31536000",
  });
  if (error) return source.remoteUrl ?? null;

  return supabase.storage.from("previews").getPublicUrl(path).data.publicUrl;
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  ];
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function text(raw: FormDataEntryValue | null, max = 500): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function createItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const url = normalizeUrlInput(String(formData.get("url") ?? ""));
  if (!url) return { error: "Ese link no parece vÃ¡lido." };

  const canonical = text(formData.get("canonicalUrl"), 2000) ?? canonicalizeUrl(url);
  const imageUrl = await storeImage(supabase, user.id, {
    file: formData.get("imageFile") as File | null,
    remoteUrl: text(formData.get("imageUrl"), 2000),
  });

  const categoryId = text(formData.get("categoryId"), 64);
  const status = (text(formData.get("status"), 16) ?? "pending") as ItemStatus;
  const domain = getDomain(url);
  const priceAmount = parseAmount(formData.get("priceAmount"));

  const { error } = await supabase.from("items").insert({
    user_id: user.id,
    category_id: categoryId,
    url,
    canonical_url: canonical,
    domain,
    site_name: text(formData.get("siteName"), 120),
    title: text(formData.get("title"), 300),
    description: text(formData.get("description"), 400),
    image_url: imageUrl,
    favicon_url: faviconFor(url),
    price_amount: priceAmount,
    price_currency: text(formData.get("priceCurrency"), 8),
    status,
    note: text(formData.get("note"), 500),
    tags: parseTags(formData.get("tags")),
  });

  if (error) {
    if (error.code === "23505") return { error: "Ese link ya estÃ¡ guardado en tu lista." };
    return { error: "No se pudo guardar. ProbÃ¡ de nuevo." };
  }

  revalidateLists();
  return {
    error: null,
    ok: true,
    saved: { domain, has_price: priceAmount !== null, has_category: categoryId !== null },
  };
}

export async function updateItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const id = text(formData.get("id"), 64);
  if (!id) return { error: "Falta el item a editar." };

  const newFile = formData.get("imageFile") as File | null;
  const currentImage = text(formData.get("imageUrl"), 2000);
  const imageUrl =
    newFile && newFile.size > 0
      ? ((await storeImage(supabase, user.id, { file: newFile })) ?? currentImage)
      : currentImage;

  const { error } = await supabase
    .from("items")
    .update({
      category_id: text(formData.get("categoryId"), 64),
      title: text(formData.get("title"), 300),
      image_url: imageUrl,
      price_amount: parseAmount(formData.get("priceAmount")),
      price_currency: text(formData.get("priceCurrency"), 8),
      status: (text(formData.get("status"), 16) ?? "pending") as ItemStatus,
      note: text(formData.get("note"), 500),
      tags: parseTags(formData.get("tags")),
    })
    .eq("id", id);

  if (error) return { error: "No se pudo guardar el cambio." };

  revalidateLists();
  return { error: null, ok: true };
}

export type PurchaseDetails = {
  source: PurchaseSource | null;
  paidAmount: string;
  paidCurrency: string;
};

/**
 * `purchase` solo aplica al marcar comprado. La fecha de compra la pone la
 * base, y un trigger limpia estos datos si el item vuelve a otro estado.
 */
export async function setItemStatus(id: string, status: ItemStatus, purchase?: PurchaseDetails) {
  const supabase = await createClient();
  await requireUser(supabase);

  const paidAmount = status === "bought" && purchase ? parseAmount(purchase.paidAmount) : null;
  const paidCurrency =
    paidAmount !== null && purchase && CURRENCIES.includes(purchase.paidCurrency) ? purchase.paidCurrency : "ARS";

  await supabase
    .from("items")
    .update({
      status,
      purchase_source: status === "bought" ? (purchase?.source ?? null) : null,
      paid_amount: paidAmount,
      paid_currency: paidAmount !== null ? paidCurrency : null,
    })
    .eq("id", id);
  revalidateLists();
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  await requireUser(supabase);
  await supabase.from("items").delete().eq("id", id);
  revalidateLists();
}

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const name = text(formData.get("name"), 40);
  if (!name) return { error: "PonÃ© un nombre." };

  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    emoji: text(formData.get("emoji"), 8),
    position: count ?? 0,
  });

  if (error) return { error: "No se pudo crear la categorÃ­a." };

  revalidateLists();
  return { error: null, ok: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await requireUser(supabase);
  // Los items de esa categorÃ­a quedan sin categorÃ­a, no se borran.
  await supabase.from("categories").delete().eq("id", id);
  revalidateLists();
}

/** Agrega una tienda favorita desde su link (sirve cualquier pÃ¡gina de la tienda). */
export async function addStore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  await requireUser(supabase);

  const input = normalizeUrlInput(String(formData.get("url") ?? ""));
  const domain = input ? storeDomain(input) : "";
  if (!input || !domain.includes(".")) return { error: "Ese link no parece vÃ¡lido." };
  if (!isStoreDomain(domain)) return { error: "Ese es un link corto. PegÃ¡ el de la pÃ¡gina de la tienda." };

  const url = `https://${domain}`;
  let name = text(formData.get("name"), 60);
  if (!name && isPubliclyFetchable(url)) {
    // El nombre que declara la tienda (og:site_name) suele ser mejor que el dominio.
    const preview = await fetchPreview(url).catch(() => null);
    name = preview?.siteName?.trim().slice(0, 60) || null;
  }

  const { error } = await supabase.from("stores").insert({
    domain,
    name: name ?? storeNameFromDomain(domain),
    url,
    favicon_url: faviconFor(url),
  });

  if (error) {
    if (error.code === "23505") return { error: "Esa tienda ya estÃ¡ en tus favoritas." };
    return { error: "No se pudo guardar la tienda. ProbÃ¡ de nuevo." };
  }

  revalidateLists();
  return { error: null, ok: true, store: { domain } };
}

/** Guarda como favorita la tienda de un producto de la lista. Si ya estaba, no hace nada. */
export async function saveStoreFromItem(itemId: string) {
  const supabase = await createClient();
  await requireUser(supabase);

  const { data: item } = await supabase.from("items").select("url, site_name").eq("id", itemId).maybeSingle();
  if (!item) return;

  const domain = storeDomain(item.url);
  if (!isStoreDomain(domain)) return;
  const url = `https://${domain}`;
  await supabase.from("stores").upsert(
    { domain, name: item.site_name?.slice(0, 60) || storeNameFromDomain(domain), url, favicon_url: faviconFor(url) },
    { onConflict: "user_id,domain", ignoreDuplicates: true },
  );

  revalidateLists();
}

export async function removeStore(id: string) {
  const supabase = await createClient();
  await requireUser(supabase);
  await supabase.from("stores").delete().eq("id", id);
  revalidateLists();
}

/**
 * Devuelve el token del link pÃºblico de la lista (o de una categorÃ­a), creÃ¡ndolo
 * si todavÃ­a no existe. Hay uno solo por alcance, asÃ­ se puede reenviar el mismo.
 */
export async function getOrCreateShareLink(
  categoryId: string | null,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient();
  await requireUser(supabase);

  const existing = supabase.from("share_links").select("token");
  const { data: found } = await (categoryId
    ? existing.eq("category_id", categoryId)
    : existing.is("category_id", null)
  ).maybeSingle();
  if (found) return { token: found.token, error: null };

  const { data: created, error } = await supabase
    .from("share_links")
    .insert({ category_id: categoryId })
    .select("token")
    .single();
  if (error || !created) return { token: null, error: "No se pudo crear el link. ProbÃ¡ de nuevo." };

  revalidateLists();
  return { token: created.token, error: null };
}

/** Desactiva el link: quien lo tenga deja de ver la lista. Uno nuevo sale con otro token. */
export async function revokeShareLink(token: string) {
  const supabase = await createClient();
  await requireUser(supabase);
  await supabase.from("share_links").delete().eq("token", token);
  revalidateLists();
}

/** Borra imÃ¡genes, links, categorÃ­as y el usuario. No hay vuelta atrÃ¡s. */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  if (text(formData.get("confirmation"), 20)?.toUpperCase() !== "ELIMINAR") {
    return { error: "EscribÃ­ ELIMINAR para confirmar." };
  }

  // Los archivos del Storage no caen con el usuario, asÃ­ que se borran primero.
  const bucket = supabase.storage.from("previews");
  for (let round = 0; round < 50; round++) {
    const { data: files, error: listError } = await bucket.list(user.id, { limit: 100 });
    if (listError) return { error: "No se pudieron borrar tus imÃ¡genes. ProbÃ¡ de nuevo." };
    if (!files?.length) break;

    const { data: removed, error: removeError } = await bucket.remove(
      files.map((file) => `${user.id}/${file.name}`),
    );
    if (removeError || !removed?.length) {
      return { error: "No se pudieron borrar tus imÃ¡genes. ProbÃ¡ de nuevo." };
    }
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: "No se pudo eliminar la cuenta. ProbÃ¡ de nuevo." };

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
