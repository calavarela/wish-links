"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { signIn, signUp, type AuthState } from "./actions";

const EMPTY: AuthState = { error: null, message: null };

/** Registra el éxito (ya con el usuario identificado) y recién después navega. */
function useAuthSuccess(state: AuthState) {
  const router = useRouter();

  useEffect(() => {
    if (!state.event) return;
    if (state.user) {
      posthog.identify(state.user.id, state.user.email ? { email: state.user.email } : undefined);
    }
    posthog.capture(state.event);
    if (state.next) router.replace(state.next);
  }, [state, router]);
}

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-subtle focus:border-ink";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, signInAction, signingIn] = useActionState(signIn, EMPTY);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, EMPTY);
  useAuthSuccess(signInState);
  useAuthSuccess(signUpState);

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signingIn : signingUp;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <form
        action={isSignIn ? signInAction : signUpAction}
        className="flex flex-col gap-3"
        key={mode}
      >
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
          <div className="relative">
            <input
              className={`${inputClass} pr-11`}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              placeholder={isSignIn ? "Tu contraseña" : "Mínimo 8 caracteres"}
              minLength={isSignIn ? undefined : 8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle transition hover:text-ink"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
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
