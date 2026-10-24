"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import PasswordInput from "@/components/password-input";
import { changePassword, type AuthState } from "../../login/actions";
import { inputClass } from "../../login/login-form";

const EMPTY: AuthState = { error: null, message: null };

export default function ChangePasswordForm({ askCurrent }: { askCurrent: boolean }) {
  const [state, formAction, saving] = useActionState(changePassword, EMPTY);

  return (
    <form
      action={formAction}
      onSubmit={() => posthog.capture("password_change_submitted", { recovery: !askCurrent })}
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
    >
      {askCurrent && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Contraseña actual</span>
          <PasswordInput className={inputClass} name="current" autoComplete="current-password" required />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Contraseña nueva</span>
        <PasswordInput
          className={inputClass}
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Repetí la contraseña nueva</span>
        <PasswordInput className={inputClass} name="repeat" autoComplete="new-password" minLength={8} required />
      </label>

      {state.error && <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">{state.error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        Guardar contraseña
      </button>
    </form>
  );
}
