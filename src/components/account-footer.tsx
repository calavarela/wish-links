"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { deleteAccount, type ActionState } from "@/app/actions";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

export default function AccountFooter() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, deleting] = useActionState(deleteAccount, EMPTY);

  function close() {
    setOpen(false);
    setConfirmation("");
  }

  return (
    <>
      <footer className="flex flex-col items-center gap-2 px-4 pb-8 text-xs text-subtle sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/terminos" className="transition hover:text-ink">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="transition hover:text-ink">
            Política de privacidad
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="transition hover:text-brand">
            Eliminar mi cuenta
          </button>
        </div>
        <p>© {new Date().getFullYear()} Wish Links</p>
      </footer>

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
            Se borran para siempre tu cuenta, todos tus links, tus categorías y las imágenes que
            guardaste. No se puede deshacer.
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
