"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { requestPasswordReset, type AuthState } from "../login/actions";
import { inputClass } from "../login/login-form";

const EMPTY: AuthState = { error: null, message: null };

export default function ResetRequestForm() {
  const [state, formAction, sending] = useActionState(requestPasswordReset, EMPTY);

  return (
    <form
      action={formAction}
      onSubmit={() => posthog.capture("password_reset_requested")}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Email de tu cuenta</span>
        <input className={inputClass} type="email" name="email" autoComplete="email" placeholder="vos@email.com" required />
      </label>

      {state.error && <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">{state.error}</p>}
      {state.message && <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-muted">{state.message}</p>}

      <button
        type="submit"
        disabled={sending}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
      >
        {sending && <Loader2 className="size-4 animate-spin" />}
        {state.message ? "Mandar de nuevo" : "Mandarme el link"}
      </button>
    </form>
  );
}
