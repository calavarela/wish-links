"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { AlertCircle, Check, Copy, Loader2, Plus, Ticket, X } from "lucide-react";
import posthog from "posthog-js";
import { addDiscountCode, deleteDiscountCode, type ActionState } from "@/app/actions";
import { expiryLabel } from "@/lib/code-expiry";
import type { DiscountCode } from "@/lib/types";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

// Reloj compartido: avisa una vez por minuto para que la cuenta regresiva avance.
let nowSnapshot = 0;
function subscribeMinute(onChange: () => void) {
  const id = setInterval(() => {
    nowSnapshot = Date.now();
    onChange();
  }, 60_000);
  return () => clearInterval(id);
}

/** La hora actual, solo en el navegador (null en el servidor y durante la hidratación). */
function useNow(): Date | null {
  const ms = useSyncExternalStore(
    subscribeMinute,
    () => (nowSnapshot ||= Date.now()),
    () => 0,
  );
  return ms ? new Date(ms) : null;
}

/** Códigos vigentes de una tienda, con el formulario para cargar uno nuevo. */
export default function DiscountCodes({ domain, codes }: { domain: string; codes: DiscountCode[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Ticket className="size-4 text-amber-700" />
          Códigos de descuento
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted transition hover:border-ink hover:text-ink"
          >
            <Plus className="size-3.5" />
            Agregar
          </button>
        )}
      </div>

      {codes.length === 0 && !adding && (
        <p className="mt-2 text-xs text-muted">
          Guardá acá los códigos que te lleguen por Instagram o mail. También los buscamos en la página de la
          tienda todos los días.
        </p>
      )}

      {codes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {codes.map((code) => (
            <CodeRow key={code.id} code={code} />
          ))}
        </ul>
      )}

      {adding && <AddCodeForm domain={domain} onDone={() => setAdding(false)} />}
    </section>
  );
}

function CodeRow({ code }: { code: DiscountCode }) {
  const [copied, setCopied] = useState(false);
  const [removing, startTransition] = useTransition();

  function copy() {
    void navigator.clipboard?.writeText(code.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
    posthog.capture("discount_code_copied", { domain: code.domain, source: code.source, from: "store_page" });
  }

  const now = useNow();
  // En el servidor no hay "ahora" confiable (otra zona horaria): el vencimiento se calcula en el navegador.
  const expiry = code.expires_on && now ? expiryLabel(code.expires_on, now) : null;
  const expired = expiry?.expired ?? false;
  const details = [code.description, code.source === "detected" && "Encontrado en la tienda"].filter(Boolean);

  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${expired ? "bg-stone-100" : "bg-amber-50"} ${
        removing ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-mono text-sm font-semibold tracking-wide ${
            expired ? "text-subtle line-through" : "text-amber-900"
          }`}
        >
          {code.code}
        </p>
        <p className={`truncate text-[11px] ${expired ? "text-subtle" : "text-amber-800/80"}`}>
          {expiry && (
            <span className={expired ? "font-medium text-muted" : expiry.soon ? "font-medium text-brand" : ""}>
              {expiry.text}
              {details.length > 0 && " · "}
            </span>
          )}
          {details.join(" · ")}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-surface px-2 py-1 text-xs font-medium text-amber-900 shadow-sm transition hover:bg-amber-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
      <button
        type="button"
        aria-label={`Borrar el código ${code.code}`}
        disabled={removing}
        onClick={() => {
          if (!confirm(`¿Borrar el código ${code.code}?`)) return;
          posthog.capture("discount_code_deleted", { source: code.source });
          startTransition(() => deleteDiscountCode(code.id));
        }}
        className="shrink-0 rounded-lg p-1 text-amber-800/60 transition hover:bg-amber-100 hover:text-amber-900"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

function AddCodeForm({ domain, onDone }: { domain: string; onDone: () => void }) {
  const [state, formAction, saving] = useActionState(addDiscountCode, EMPTY);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    posthog.capture("discount_code_added");
    onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="domain" value={domain} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.4fr]">
        <input
          ref={codeRef}
          className={`${fieldClass} font-mono uppercase`}
          name="code"
          placeholder="CÓDIGO"
          maxLength={40}
          required
          autoCapitalize="characters"
          autoComplete="off"
        />
        <input className={fieldClass} name="description" placeholder="Qué da (ej. 15% OFF)" maxLength={120} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Fecha de vencimiento (opcional)</span>
        <input className={fieldClass} name="expiresOn" type="date" />
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
          onClick={onDone}
          className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-muted transition hover:border-ink hover:text-ink"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Guardar código
        </button>
      </div>
    </form>
  );
}
