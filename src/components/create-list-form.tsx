"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import posthog from "posthog-js";
import { createSharedList, type ActionState } from "@/app/actions";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

/** fieldClass trae w-full, que le gana a un ancho fijo: para el emoji se reemplaza. */
export const emojiFieldClass = `${fieldClass.replace("w-full", "w-14")} shrink-0 text-center`;

/** Crea la lista y lleva a su página (el redirect lo hace la action). */
export default function CreateListForm() {
  const [state, formAction, saving] = useActionState(createSharedList, EMPTY);

  return (
    <form
      action={formAction}
      onSubmit={() => posthog.capture("shared_list_created")}
      className="mt-5 flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input className={emojiFieldClass} name="emoji" placeholder="🏡" maxLength={4} aria-label="Emoji" />
        <input
          className={`${fieldClass} min-w-0 flex-1`}
          name="name"
          placeholder="Nombre de la lista nueva"
          maxLength={60}
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span className="hidden sm:block">Crear</span>
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
