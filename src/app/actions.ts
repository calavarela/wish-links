"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ItemStatus } from "@/lib/types";
import { canonicalizeUrl, faviconFor, getDomain, isPubliclyFetchable, normalizeUrlInput } from "@/lib/url";

/** `ok` se usa en el cliente para saber cuándo cerrar el diálogo. */
export type ActionState = { error: string | null; ok?: boolean };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Copia la imagen al Storage propio. Si la tienda después borra el producto o
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
  if (!url) return { error: "Ese link no parece válido." };

  const canonical = text(formData.get("canonicalUrl"), 2000) ?? canonicalizeUrl(url);
  const imageUrl = await storeImage(supabase, user.id, {
    file: formData.get("imageFile") as File | null,
    remoteUrl: text(formData.get("imageUrl"), 2000),
  });

  const categoryId = text(formData.get("categoryId"), 64);
  const status = (text(formData.get("status"), 16) ?? "pending") as ItemStatus;

  const { error } = await supabase.from("items").insert({
    user_id: user.id,
    category_id: categoryId,
    url,
    canonical_url: canonical,
    domain: getDomain(url),
    site_name: text(formData.get("siteName"), 120),
    title: text(formData.get("title"), 300),
    description: text(formData.get("description"), 400),
    image_url: imageUrl,
    favicon_url: faviconFor(url),
    price_amount: parseAmount(formData.get("priceAmount")),
    price_currency: text(formData.get("priceCurrency"), 8),
    status,
    note: text(formData.get("note"), 500),
    tags: parseTags(formData.get("tags")),
  });

  if (error) {
    if (error.code === "23505") return { error: "Ese link ya está guardado en tu lista." };
    return { error: "No se pudo guardar. Probá de nuevo." };
  }

  revalidatePath("/");
  return { error: null, ok: true };
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

  revalidatePath("/");
  return { error: null, ok: true };
}

export async function setItemStatus(id: string, status: ItemStatus) {
  const supabase = await createClient();
  await requireUser(supabase);
  await supabase.from("items").update({ status }).eq("id", id);
  revalidatePath("/");
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  await requireUser(supabase);
  await supabase.from("items").delete().eq("id", id);
  revalidatePath("/");
}

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const name = text(formData.get("name"), 40);
  if (!name) return { error: "Poné un nombre." };

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

  if (error) return { error: "No se pudo crear la categoría." };

  revalidatePath("/");
  return { error: null, ok: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await requireUser(supabase);
  // Los items de esa categoría quedan sin categoría, no se borran.
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
