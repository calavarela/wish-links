"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Pencil } from "lucide-react";
import posthog from "posthog-js";
import { renameStore, type ActionState } from "@/app/actions";
import type { Store } from "@/lib/types";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";

export default function RenameStoreButton({ store }: { store: Pick<Store, "id" | "name" | "domain"> }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Cambiar el nombre de ${store.name}`}
        title="Cambiar nombre"
        className="rounded-lg p-1.5 text-subtle transition hover:bg-stone-100 hover:text-ink"
      >
        <Pencil className="size-3.5" />
      </button>

      {/* Se monta solo abierto: así cada vez arranca con el nombre actual y sin errores viejos. */}
      {open && <RenameDialog store={store} onClose={close} />}
    </>
  );
}

const EMPTY: ActionState = { error: null };

function RenameDialog({ store, onClose }: { store: Pick<Store, "id" | "name" | "domain">; onClose: () => void }) {
  const [state, formAction, saving] = useActionState(renameStore, EMPTY);

  useEffect(() => {
    if (!state.ok) return;
    posthog.capture("store_renamed");
    onClose();
  }, [state, onClose]);

  return (
    <Dialog open onClose={onClose} title="Nombre de la tienda">
      <form action={formAction} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="id" value={store.id} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Cómo querés verla ({store.domain})</span>
          <input
            className={fieldClass}
            name="name"
            defaultValue={store.name}
            maxLength={60}
            required
            autoFocus
            onFocus={(event) => event.target.select()}
          />
        </label>

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
            Guardar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
