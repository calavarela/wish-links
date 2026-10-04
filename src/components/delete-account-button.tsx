"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { deleteAccount, type ActionState } from "@/app/actions";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

/** Botón + confirmación escribiendo ELIMINAR. Vive en la pantalla de perfil. */
export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, deleting] = useActionState(deleteAccount, EMPTY);

  function close() {
    setOpen(false);
    setConfirmation("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-brand transition hover:bg-brand-soft"
      >
        <Trash2 className="size-4" />
        Eliminar mi cuenta
      </button>

      <Dialog open={open} onClose={close} title="Eliminar mi cuenta">
        <form
          action={formAction}
          className="flex flex-col gap-4 p-5"
          onSubmit={() => {
            posthog.capture("account_delete_submitted");
            posthog.reset();
          }}
        >
          <p className="text-sm text-muted">
            Se borran para siempre tu cuenta, todos tus links, tus categorías, tus tiendas y las imágenes que
            guardaste. Las listas compartidas que creaste se borran para todas las personas que estén en ellas.
            No se puede deshacer.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              Para confirmar, escribí <strong className="text-ink">ELIMINAR</strong>
            </span>
            <input
              className={fieldClass}
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
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
              onClick={close}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-ink hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={deleting || confirmation.trim().toUpperCase() !== "ELIMINAR"}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Eliminar cuenta y datos
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
