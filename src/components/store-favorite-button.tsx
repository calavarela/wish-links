"use client";

import { useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import posthog from "posthog-js";
import { removeStore, saveStoreFromItem } from "@/app/actions";

/**
 * Guarda o quita la tienda de favoritas. Para guardarla usa cualquier producto
 * suyo, que es de donde salen el dominio y el nombre.
 */
export default function StoreFavoriteButton({
  storeId,
  itemId,
  name,
}: {
  storeId: string | null;
  itemId: string | null;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const saved = storeId !== null;
  if (!saved && !itemId) return null;

  function toggle() {
    if (storeId !== null) {
      if (!confirm(`¿Quitar ${name} de tus tiendas favoritas?`)) return;
      posthog.capture("store_removed");
      startTransition(() => removeStore(storeId));
    } else if (itemId) {
      posthog.capture("store_saved", { source: "store_page" });
      startTransition(() => saveStoreFromItem(itemId));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
        saved ? "border-ink bg-ink text-white hover:bg-stone-700" : "border-line hover:border-ink"
      }`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Star className="size-4" fill={saved ? "currentColor" : "none"} />
      )}
      {saved ? "Favorita" : "Guardar como favorita"}
    </button>
  );
}
