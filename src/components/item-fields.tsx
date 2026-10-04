"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Sparkles } from "lucide-react";
import type { Category, ItemStatus } from "@/lib/types";
import { CURRENCIES, STATUS_LABELS } from "@/lib/types";
import TagPicker from "./tag-picker";

export const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-subtle focus:border-ink";

export type ItemDefaults = {
  title?: string | null;
  imageUrl?: string | null;
  faviconUrl?: string | null;
  domain?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  categoryId?: string | null;
  status?: ItemStatus;
  note?: string | null;
  tags?: string[];
};

export default function ItemFields({
  categories,
  defaults,
  categorySuggested = false,
}: {
  categories: Category[];
  defaults: ItemDefaults;
  /** La categoría de `defaults` la eligió la sugerencia automática: se avisa, para revisarla. */
  categorySuggested?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(defaults.imageUrl ?? null);

  function onFilePicked(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
  }

  /** Permite pegar una captura con Ctrl+V cuando la tienda bloquea la preview. */
  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (!file || !fileInputRef.current) return;
    event.preventDefault();
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInputRef.current.files = transfer.files;
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col gap-3" onPaste={onPaste}>
      <input type="hidden" name="imageUrl" value={defaults.imageUrl ?? ""} />

      <div className="flex gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-line bg-stone-100">
          {preview ? (
            // Puede ser una URL externa o un blob local: <img> evita configurar hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-subtle">
              {defaults.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={defaults.faviconUrl} alt="" className="size-6 rounded" />
              ) : (
                <Link2 className="size-5" />
              )}
              <span className="px-1 text-center text-[10px] leading-tight">Sin imagen</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            className={fieldClass}
            name="title"
            defaultValue={defaults.title ?? ""}
            placeholder="Título del producto"
            maxLength={300}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-ink hover:text-ink"
          >
            <ImagePlus className="size-3.5" />
            {preview ? "Cambiar imagen" : "Subir imagen"}
          </button>
          <p className="text-[11px] leading-tight text-subtle">
            También podés pegar una captura con Ctrl+V.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name="imageFile"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => onFilePicked(event.target.files)}
      />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Precio</span>
          <input
            className={fieldClass}
            name="priceAmount"
            inputMode="decimal"
            defaultValue={defaults.priceAmount ?? ""}
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Moneda</span>
          <select
            className={`${fieldClass} pr-8`}
            name="priceCurrency"
            defaultValue={defaults.priceCurrency ?? "ARS"}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sin categorías para elegir (en una lista compartida no hay), el selector no aporta nada. */}
      <div className={`grid gap-2 ${categories.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        {categories.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              Categoría
              {categorySuggested && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">
                  <Sparkles className="size-2.5" />
                  sugerida
                </span>
              )}
            </span>
            <select className={fieldClass} name="categoryId" defaultValue={defaults.categoryId ?? ""}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji ? `${category.emoji} ` : ""}
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Estado</span>
          <select className={fieldClass} name="status" defaultValue={defaults.status ?? "pending"}>
            {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Nota</span>
        <textarea
          className={`${fieldClass} min-h-16 resize-y`}
          name="note"
          defaultValue={defaults.note ?? ""}
          placeholder="El negro, talle M"
          maxLength={500}
        />
      </label>

      <TagPicker defaultValue={defaults.tags ?? []} />
    </div>
  );
}
