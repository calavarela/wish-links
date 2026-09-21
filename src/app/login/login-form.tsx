"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn, signUp, type AuthState } from "./actions";

const EMPTY: AuthState = { error: null, message: null };

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-subtle focus:border-ink";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState(signIn, EMPTY);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, EMPTY);

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signingIn : signingUp;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <form action={isSignIn ? signInAction : signUpAction} className="flex flex-col gap-3" key={mode}>
        <input type="hidden" name="next" value={next} />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Email</span>
          <input
            className={inputClass}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="vos@email.com"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Contraseña</span>
          <input
            className={inputClass}
            type="password"
            name="password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            placeholder={isSignIn ? "Tu contraseña" : "Mínimo 8 caracteres"}
            minLength={isSignIn ? undefined : 8}
            required
          />
        </label>

        {state.error && (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">{state.error}</p>
        )}
        {state.message && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-muted">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isSignIn ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isSignIn ? "signup" : "signin")}
        className="mt-4 w-full text-center text-xs text-muted transition hover:text-ink"
      >
        {isSignIn ? "No tengo cuenta todavía" : "Ya tengo cuenta"}
      </button>
    </div>
  );
}
