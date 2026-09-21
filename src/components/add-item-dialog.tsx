"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { createItem, type ActionState } from "@/app/actions";
import type { Category, LinkPreview } from "@/lib/types";
import Dialog from "./dialog";
import ItemFields, { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

export default function AddItemDialog({
  open,
  onClose,
  categories,
  prefillUrl,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  prefillUrl?: string | null;
}) {
  const [url, setUrl] = useState(prefillUrl ?? "");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [duplicate, setDuplicate] = useState<{ title: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [state, formAction, saving] = useActionState(createItem, EMPTY);

  const loadPreview = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setFetchError(null);
    setDuplicate(null);
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFetchError(data.error ?? "No se pudo leer el link.");
        return;
      }
      if (data.existing) {
        setDuplicate({ title: data.existing.title });
        return;
      }
      setPreview(data.preview as LinkPreview);
    } catch {
      setFetchError("No se pudo leer el link. Revisá tu conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cuando llega compartido desde el celular, la preview se busca sola.
  useEffect(() => {
    if (open && prefillUrl) {
      setUrl(prefillUrl);
      void loadPreview(prefillUrl);
    }
  }, [open, prefillUrl, loadPreview]);

  useEffect(() => {
    if (state.ok) {
      setUrl("");
      setPreview(null);
      onClose();
    }
  }, [state, onClose]);

  function reset() {
    setUrl("");
    setPreview(null);
    setDuplicate(null);
    setFetchError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={reset} title="Agregar link">
      {!preview ? (
        <form
          className="flex flex-col gap-3 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void loadPreview(url);
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Pegá el link del producto</span>
            <input
              className={fieldClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              inputMode="url"
              autoFocus
              required
            />
          </label>

          {fetchError && (
            <p className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
              <AlertCircle className="size-3.5 shrink-0" />
              {fetchError}
            </p>
          )}

          {duplicate && (
            <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-muted">
              Ya tenés este link guardado
              {duplicate.title ? `: “${duplicate.title}”` : "."}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Leyendo la página..." : "Continuar"}
          </button>
        </form>
      ) : (
        <form action={formAction} className="flex flex-col gap-4 p-5">
          <input type="hidden" name="url" value={preview.url} />
          <input type="hidden" name="canonicalUrl" value={preview.canonicalUrl} />
          <input type="hidden" name="siteName" value={preview.siteName ?? ""} />
          <input type="hidden" name="description" value={preview.description ?? ""} />

          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.faviconUrl} alt="" className="size-4 shrink-0 rounded" />
            <span className="truncate text-xs text-muted">{preview.domain}</span>
          </div>

          {preview.blocked && (
            <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-muted">
              Esta tienda no deja leer la vista previa. Escribí el título y subí o pegá una imagen
              para reconocerlo después.
            </p>
          )}

          <ItemFields
            categories={categories}
            defaults={{
              title: preview.title,
              imageUrl: preview.imageUrl,
              faviconUrl: preview.faviconUrl,
              domain: preview.domain,
              priceAmount: preview.priceAmount,
              priceCurrency: preview.priceCurrency,
              status: "pending",
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
              onClick={() => setPreview(null)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-ink hover:text-ink"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
