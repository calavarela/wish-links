"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import posthog from "posthog-js";
import { createCategoryInline } from "@/app/actions";
import type { Category } from "@/lib/types";
import { fieldClass } from "./item-fields";

const NEW = "__new__";

/**
 * Selector de categoría del formulario de producto, con "Crear nueva
 * categoría" al final. La nueva se crea sin salir del formulario (no es un
 * <form> anidado: el Enter se intercepta) y queda elegida.
 */
export default function CategoryField({
  categories,
  defaultValue,
  suggested,
  className = "",
}: {
  categories: Category[];
  defaultValue: string | null;
  suggested: boolean;
  className?: string;
}) {
  const [extra, setExtra] = useState<Category[]>([]);
  const [value, setValue] = useState(defaultValue ?? "");
  const [creating, setCreating] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Las recién creadas se suman acá hasta que la página se refresque con las del servidor.
  const options = [...categories, ...extra.filter((e) => !categories.some((c) => c.id === e.id))];

  function cancel() {
    setCreating(false);
    setName("");
    setEmoji("");
    setError(null);
  }

  function create() {
    if (!name.trim()) {
      setError("Poné un nombre.");
      nameRef.current?.focus();
      return;
    }
    startTransition(async () => {
      const result = await createCategoryInline(name, emoji);
      if (!result.category) {
        setError(result.error ?? "No se pudo crear la categoría.");
        return;
      }
      const category = result.category;
      setExtra((current) => (current.some((c) => c.id === category.id) ? current : [...current, category]));
      setValue(category.id);
      setNotice(result.existed ? `Ya tenías "${category.name}": la elegimos.` : null);
      posthog.capture("category_created", { from: "item_form", existed: result.existed });
      cancel();
    });
  }

  return (
    <div className={`flex flex-col gap-1.5 ${creating ? "col-span-2" : ""} ${className}`}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {creating ? "Nueva categoría" : "Categoría"}
        {suggested && !creating && value === (defaultValue ?? "") && (
          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">
            <Sparkles className="size-2.5" />
            sugerida
          </span>
        )}
      </span>

      {/* El valor viaja siempre en este hidden: el select de abajo es solo la interfaz. */}
      <input type="hidden" name="categoryId" value={value} />

      {creating ? (
        <div className="flex items-center gap-2">
          <input
            className={`${fieldClass.replace("w-full", "w-12")} shrink-0 px-1 text-center`}
            value={emoji}
            onChange={(event) => setEmoji(event.target.value)}
            placeholder="✨"
            maxLength={4}
            aria-label="Emoji"
          />
          <input
            ref={nameRef}
            autoFocus
            className={`${fieldClass} min-w-0 flex-1`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              // Enter crea la categoría en vez de guardar el producto; Escape cancela sin cerrar el diálogo.
              if (event.key === "Enter") {
                event.preventDefault();
                create();
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                cancel();
              }
            }}
            placeholder="Ej. Regalos de cumple"
            maxLength={40}
            aria-label="Nombre de la categoría"
          />
          <button
            type="button"
            onClick={create}
            disabled={saving}
            aria-label="Crear categoría"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-stone-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancelar"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:border-ink hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <select
          className={fieldClass}
          value={value}
          aria-label="Categoría"
          onChange={(event) => {
            setNotice(null);
            if (event.target.value === NEW) setCreating(true);
            else setValue(event.target.value);
          }}
        >
          <option value="">Sin categoría</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.emoji ? `${category.emoji} ` : ""}
              {category.name}
            </option>
          ))}
          <option value={NEW}>+ Crear nueva categoría</option>
        </select>
      )}

      {error && <p className="text-xs text-brand">{error}</p>}
      {notice && <p className="text-[11px] text-subtle">{notice}</p>}
    </div>
  );
}
