"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { updateItem, type ActionState } from "@/app/actions";
import type { Category, Item } from "@/lib/types";
import Dialog from "./dialog";
import ItemFields from "./item-fields";

const EMPTY: ActionState = { error: null };

export default function EditItemDialog({
  open,
  onClose,
  item,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  item: Item;
  categories: Category[];
}) {
  const [state, formAction, saving] = useActionState(updateItem, EMPTY);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Dialog open={open} onClose={onClose} title="Editar link">
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="id" value={item.id} />

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-xs text-muted transition hover:text-ink"
        >
          {item.favicon_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.favicon_url} alt="" className="size-4 shrink-0 rounded" />
          )}
          <span className="truncate">{item.domain}</span>
          <ExternalLink className="ml-auto size-3.5 shrink-0" />
        </a>

        <ItemFields
          categories={categories}
          defaults={{
            title: item.title,
            imageUrl: item.image_url,
            faviconUrl: item.favicon_url,
            domain: item.domain,
            priceAmount: item.price_amount,
            priceCurrency: item.price_currency,
            categoryId: item.category_id,
            status: item.status,
            note: item.note,
            tags: item.tags,
          }}
        />

        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
            <AlertCircle className="size-3.5 shrink-0" />
            {state.error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-ink hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </Dialog>
  );
}
