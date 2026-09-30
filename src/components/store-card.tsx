"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { removeStore } from "@/app/actions";
import type { Store } from "@/lib/types";

export default function StoreCard({ store, pendingCount }: { store: Store; pendingCount: number }) {
  const [removing, startTransition] = useTransition();
  const storePath = `/tiendas/${encodeURIComponent(store.domain)}`;

  function remove() {
    if (!confirm(`¿Quitar ${store.name} de tus tiendas favoritas?`)) return;
    posthog.capture("store_removed");
    startTransition(() => removeStore(store.id));
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition ${
        removing ? "opacity-50" : ""
      }`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100">
        {store.favicon_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.favicon_url} alt="" className="size-5 rounded" />
        )}
      </div>

      <Link href={storePath} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium transition hover:text-brand">{store.name}</span>
        <span className="block truncate text-[11px] text-subtle">
          {store.domain}
          {" · "}
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? "producto pendiente" : "productos pendientes"}`
            : "sin productos guardados"}
        </span>
      </Link>

      <a
        href={store.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => posthog.capture("store_opened", { domain: store.domain })}
        aria-label={`Ir a ${store.name}`}
        title="Ir a la tienda"
        className="rounded-lg p-1.5 text-subtle transition hover:bg-stone-100 hover:text-ink"
      >
        <ExternalLink className="size-3.5" />
      </a>

      <button
        type="button"
        onClick={remove}
        disabled={removing}
        aria-label={`Quitar ${store.name}`}
        className="rounded-lg p-1.5 text-subtle transition hover:bg-brand-soft hover:text-brand"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
