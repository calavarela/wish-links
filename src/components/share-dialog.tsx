"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import posthog from "posthog-js";
import { getOrCreateShareLink, revokeShareLink } from "@/app/actions";
import type { Category, ShareLink } from "@/lib/types";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";

export default function ShareDialog({
  open,
  onClose,
  categories,
  shareLinks,
  initialCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  shareLinks: ShareLink[];
  initialCategoryId: string | null;
}) {
  // Se monta solo mientras está abierto (ver AppHeader), así cada vez arranca
  // limpio y en la categoría que se está mirando.
  const [scope, setScope] = useState<string>(initialCategoryId ?? "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryId = scope || null;
  const link = shareLinks.find((l) => l.category_id === categoryId) ?? null;
  const url = link && typeof window !== "undefined" ? `${window.location.origin}/w/${link.token}` : null;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await getOrCreateShareLink(categoryId);
      if (result.error) setError(result.error);
      else posthog.capture("share_link_created", { scope: categoryId ? "category" : "all" });
    });
  }

  function revoke() {
    if (!link || !confirm("Quien tenga el link va a dejar de ver la lista. ¿Desactivarlo?")) return;
    startTransition(async () => {
      await revokeShareLink(link.token);
      posthog.capture("share_link_revoked");
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      posthog.capture("share_link_copied");
    } catch {
      setError("No se pudo copiar. Seleccioná el link y copialo a mano.");
    }
  }

  async function nativeShare() {
    if (!url) return;
    try {
      await navigator.share({ title: "Mi lista de deseos", url });
      posthog.capture("share_link_shared");
    } catch {
      // Cancelado por el usuario: no hay nada que hacer.
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Compartir lista">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-muted">
          Cualquiera con el link puede ver los links <strong className="text-ink">pendientes</strong>,
          sin iniciar sesión. No ve tus notas, etiquetas ni lo que ya compraste o descartaste.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Qué compartir</span>
          <select className={fieldClass} value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">Toda la lista</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji ? `${category.emoji} ` : ""}
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {url ? (
          <>
            <div className="flex gap-2">
              <input
                className={`${fieldClass} flex-1 text-muted`}
                value={url}
                readOnly
                onFocus={(event) => event.target.select()}
                aria-label="Link para compartir"
              />
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium transition hover:border-ink"
              >
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={revoke}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-brand hover:text-brand disabled:opacity-40"
              >
                Desactivar link
              </button>
              {canNativeShare && (
                <button
                  type="button"
                  onClick={nativeShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  <Share2 className="size-4" />
                  Compartir
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={create}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Crear link
          </button>
        )}

        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
