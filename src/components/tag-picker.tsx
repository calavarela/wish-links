"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

const MAX_TAGS = 12;

/** Catálogo de etiquetas, leído desde el navegador (RLS: solo las propias). */
export function useTagCatalog(): [Tag[] | null, () => void] {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("tags")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (!cancelled) setTags((data as Tag[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return [tags, () => setVersion((v) => v + 1)];
}

const normalize = (name: string) => name.trim().toLowerCase().replace(/,/g, "").slice(0, 30);

/**
 * Elegir etiquetas tocando chips, o crear una nueva. Manda los nombres en un
 * input oculto `tags` separados por coma, como el campo de texto de antes; las
 * nuevas se suman al catálogo al guardar el producto.
 */
export default function TagPicker({ defaultValue = [] }: { defaultValue?: string[] }) {
  const [catalog] = useTagCatalog();
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [created, setCreated] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Las del catálogo, las recién creadas y las que ya tenía el producto (por si vienen de otra persona).
  const options = [...new Set([...(catalog ?? []).map((t) => t.name), ...created, ...defaultValue])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  function toggle(name: string) {
    setSelected((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : current.length < MAX_TAGS ? [...current, name] : current,
    );
  }

  function create() {
    const name = normalize(draft);
    setDraft("");
    setAdding(false);
    if (!name) return;
    // Funcionales: Enter y blur pueden llegar juntos y no tiene que quedar repetida.
    setCreated((c) => (c.includes(name) ? c : [...c, name]));
    setSelected((s) => (s.includes(name) || s.length >= MAX_TAGS ? s : [...s, name]));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">Etiquetas</span>
      <input type="hidden" name="tags" value={selected.join(",")} />

      <div className="flex flex-wrap gap-1.5">
        {options.map((name) => {
          const on = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(name)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {on && <Check className="size-3" />}
              {name}
            </button>
          );
        })}

        {adding ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter crea la etiqueta en vez de mandar el formulario del producto.
              if (event.key === "Enter") {
                event.preventDefault();
                create();
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setAdding(false);
                setDraft("");
              }
            }}
            onBlur={create}
            maxLength={30}
            placeholder="nueva etiqueta"
            className="w-32 rounded-full border border-ink bg-surface px-2.5 py-1 text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted transition hover:border-ink hover:text-ink"
          >
            <Plus className="size-3" />
            Nueva
          </button>
        )}
      </div>

      {catalog !== null && options.length === 0 && !adding && (
        <p className="text-[11px] text-subtle">Creá etiquetas para agrupar productos (ej. cumpleaños, oferta).</p>
      )}
    </div>
  );
}
