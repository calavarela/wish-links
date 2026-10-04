"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import posthog from "posthog-js";
import { deleteTag, renameTag } from "@/app/actions";
import type { Tag } from "@/lib/types";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";
import { useTagCatalog } from "./tag-picker";

/** Renombrar o borrar etiquetas del catálogo. Los cambios se aplican a todos los productos propios. */
export default function TagManager({ onClose }: { onClose: () => void }) {
  const [tags, reload] = useTagCatalog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Si se filtraba por la etiqueta que cambió, el filtro sigue a la nueva (o se saca). */
  function followFilter(oldName: string, newName: string | null) {
    if (searchParams.get("tag") !== oldName) return;
    const params = new URLSearchParams(searchParams);
    if (newName) params.set("tag", newName);
    else params.delete("tag");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Dialog open onClose={onClose} title="Etiquetas">
      <div className="flex flex-col gap-3 p-5">
        <p className="text-xs text-muted">
          Renombrar o borrar una etiqueta la cambia en todos tus productos. Las nuevas se crean al cargar o editar un
          producto.
        </p>

        {tags === null ? (
          <Loader2 className="mx-auto size-4 animate-spin text-subtle" />
        ) : tags.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
            Todavía no tenés etiquetas.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {tags.map((tag) => (
              <TagRow key={tag.id} tag={tag} onChanged={reload} followFilter={followFilter} />
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function TagRow({
  tag,
  onChanged,
  followFilter,
}: {
  tag: Tag;
  onChanged: () => void;
  followFilter: (oldName: string, newName: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const clean = name.trim().toLowerCase();
    if (clean === tag.name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameTag(tag.id, clean);
      if (result.error) {
        setError(result.error);
        return;
      }
      posthog.capture("tag_renamed");
      followFilter(tag.name, clean);
      setEditing(false);
      setError(null);
      onChanged();
    });
  }

  function remove() {
    if (!confirm(`¿Borrar la etiqueta "${tag.name}"? Se saca de todos tus productos.`)) return;
    startTransition(async () => {
      await deleteTag(tag.id);
      posthog.capture("tag_deleted");
      followFilter(tag.name, null);
      onChanged();
    });
  }

  return (
    <li className={`rounded-xl border border-line px-3 py-2 ${pending ? "opacity-50" : ""}`}>
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <input
            autoFocus
            className={`${fieldClass} min-w-0 flex-1 py-1`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={30}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setEditing(false);
                setName(tag.name);
                setError(null);
              }
            }}
          />
          <button type="submit" aria-label="Guardar" className="rounded-lg p-1.5 text-muted transition hover:bg-stone-100 hover:text-ink">
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => {
              setEditing(false);
              setName(tag.name);
              setError(null);
            }}
            className="rounded-lg p-1.5 text-muted transition hover:bg-stone-100 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{tag.name}</span>
          <button
            type="button"
            aria-label={`Renombrar ${tag.name}`}
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 text-subtle transition hover:bg-stone-100 hover:text-ink"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Borrar ${tag.name}`}
            onClick={remove}
            className="rounded-lg p-1.5 text-subtle transition hover:bg-brand-soft hover:text-brand"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-brand">{error}</p>}
    </li>
  );
}
