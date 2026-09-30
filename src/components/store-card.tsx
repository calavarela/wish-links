"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { removeStore } from "@/app/actions";
import type { Store } from "@/lib/types";

export default function StoreCard({ store, pendingCount }: { store: Store; pendingCount: number }) {
  const [removing, startTransition] = useTransition();

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

      <div className="min-w-0 flex-1">
        <a
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("store_opened", { domain: store.domain })}
          className="flex items-center gap-1.5 text-sm font-medium transition hover:text-brand"
        >
          <span className="truncate">{store.name}</span>
          <ExternalLink className="size-3 shrink-0 text-subtle" />
        </a>
        <p className="truncate text-[11px] text-subtle">
          {store.domain}
          {" · "}
          {pendingCount > 0 ? (
            <Link href={`/?q=${encodeURIComponent(store.domain)}`} className="text-muted underline hover:text-ink">
              {pendingCount} {pendingCount === 1 ? "producto pendiente" : "productos pendientes"}
            </Link>
          ) : (
            "sin productos guardados"
          )}
        </p>
      </div>

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
