"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; message: string | null };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/") || "/",
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { error: "Completá email y contraseña.", message: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const invalid = /invalid login credentials/i.test(error.message);
    return {
      error: invalid ? "Email o contraseña incorrectos." : error.message,
      message: null,
    };
  }

  // Solo se permiten rutas internas, para que nadie arme un link que saque afuera.
  redirect(next.startsWith("/") ? next : "/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Completá email y contraseña.", message: null };
  if (password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres.", message: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const exists = /already registered|already exists/i.test(error.message);
    return {
      error: exists ? "Ya existe una cuenta con ese email. Iniciá sesión." : error.message,
      message: null,
    };
  }

  // Si el proyecto pide confirmación por email, todavía no hay sesión.
  if (!data.session) {
    return {
      error: null,
      message: "Te mandamos un mail para confirmar la cuenta. Abrilo y volvé a entrar.",
    };
  }

  redirect("/");
}
