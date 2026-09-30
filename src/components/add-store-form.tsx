"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import posthog from "posthog-js";
import { addStore, type ActionState } from "@/app/actions";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

export default function AddStoreForm() {
  const [state, formAction, saving] = useActionState(addStore, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    posthog.capture("store_saved", { domain: state.store?.domain, source: "form" });
    formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-5 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={fieldClass}
          name="url"
          inputMode="url"
          placeholder="Link de la tienda (ej. tricot.com.ar)"
          required
        />
        <input className={`${fieldClass} sm:max-w-44`} name="name" placeholder="Nombre (opcional)" maxLength={60} />
        <button
          type="submit"
          disabled={saving}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Guardar
        </button>
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
          <AlertCircle className="size-3.5 shrink-0" />
          {state.error}
        </p>
      )}
    </form>
  );
}
