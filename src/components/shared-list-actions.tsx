"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Copy, Link2, Loader2, LogOut, Plus, Share2, Trash2, Users, X } from "lucide-react";
import posthog from "posthog-js";
import {
  deleteSharedList,
  getOrCreateInvite,
  removeListMember,
  renameSharedList,
  revokeInvite,
  type ActionState,
} from "@/app/actions";
import type { SharedList, SharedListPerson } from "@/lib/types";
import AddItemDialog from "./add-item-dialog";
import { emojiFieldClass } from "./create-list-form";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

export default function SharedListActions({
  list,
  people,
  isOwner,
  userId,
}: {
  list: SharedList;
  people: SharedListPerson[];
  isOwner: boolean;
  userId: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeManage = useCallback(() => setManaging(false), []);

  return (
    // En el celu van en su propia fila, así el nombre de la lista no se corta.
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <button
        type="button"
        onClick={() => setManaging(true)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-muted transition hover:border-ink hover:text-ink sm:flex-none"
      >
        <Users className="size-4" />
        Personas
      </button>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 sm:flex-none"
      >
        <Plus className="size-4" />
        Agregar
      </button>

      <AddItemDialog open={adding} onClose={closeAdd} categories={[]} sharedListId={list.id} />

      {/* Se monta solo abierto: así cada vez arranca sin errores viejos. */}
      {managing && <ManageDialog list={list} people={people} isOwner={isOwner} userId={userId} onClose={closeManage} />}
    </div>
  );
}

function ManageDialog({
  list,
  people,
  isOwner,
  userId,
  onClose,
}: {
  list: SharedList;
  people: SharedListPerson[];
  isOwner: boolean;
  userId: string | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open onClose={onClose} title={list.name}>
      <div className="flex flex-col gap-6 p-5">
        <InviteSection list={list} isOwner={isOwner} />

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted">Personas en la lista</h3>
          <ul className="flex flex-col gap-1">
            {people.map((person) => (
              <li key={person.user_id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {person.email}
                  {person.user_id === userId && <span className="text-subtle"> (vos)</span>}
                </span>
                {person.role === "owner" ? (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-muted">Creó la lista</span>
                ) : (
                  isOwner && (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Sacar a ${person.email}`}
                      onClick={() => {
                        if (!confirm(`¿Sacar a ${person.email} de la lista? Deja de verla, pero lo que agregó queda.`)) return;
                        posthog.capture("shared_list_member_removed");
                        startTransition(() => removeListMember(list.id, person.user_id));
                      }}
                      className="shrink-0 rounded-lg p-1 text-subtle transition hover:bg-brand-soft hover:text-brand"
                    >
                      <X className="size-3.5" />
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>

        {isOwner && <RenameSection list={list} />}

        <div className="border-t border-line pt-4">
          {isOwner ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Borrar "${list.name}"? Se borran todos sus productos para todas las personas.`)) return;
                posthog.capture("shared_list_deleted");
                startTransition(() => deleteSharedList(list.id));
              }}
              className="flex items-center gap-1.5 text-xs text-brand transition hover:underline"
            >
              <Trash2 className="size-3.5" />
              Borrar la lista
            </button>
          ) : (
            userId && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`¿Salir de "${list.name}"? Para volver vas a necesitar un link nuevo.`)) return;
                  posthog.capture("shared_list_left");
                  startTransition(() => removeListMember(list.id, userId));
                }}
                className="flex items-center gap-1.5 text-xs text-brand transition hover:underline"
              >
                <LogOut className="size-3.5" />
                Salir de la lista
              </button>
            )
          )}
        </div>
      </div>
    </Dialog>
  );
}

function InviteSection({ list, isOwner }: { list: SharedList; isOwner: boolean }) {
  const [token, setToken] = useState(list.invite_token);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [working, startTransition] = useTransition();
  const url = token ? `${window.location.origin}/unirse/${token}` : null;

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await getOrCreateInvite(list.id);
      if (result.error) setError(result.error);
      else {
        setToken(result.token);
        posthog.capture("shared_list_invite_created");
      }
    });
  }

  async function share() {
    if (!url) return;
    const text = `Sumate a mi lista "${list.name}" en Wish Links`;
    // En el celu abre el menú de compartir (WhatsApp, etc.); en la compu, copia.
    if (navigator.share) {
      await navigator.share({ title: list.name, text, url }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    posthog.capture("shared_list_invite_shared", { native: Boolean(navigator.share) });
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted">Invitar</h3>

      {url ? (
        <>
          <p className="text-xs text-muted">Quien abra este link y tenga cuenta (o se cree una) se suma a la lista y puede editarla.</p>
          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Link2 className="size-3.5 shrink-0 text-subtle" />
            <span className="min-w-0 flex-1 truncate text-xs">{url}</span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Copiar link"
              className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-surface hover:text-ink"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={share}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              <Share2 className="size-4" />
              Compartir link
            </button>
            {isOwner && (
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  if (!confirm("¿Desactivar el link? Los que ya están siguen; nadie nuevo puede sumarse con él.")) return;
                  posthog.capture("shared_list_invite_revoked");
                  startTransition(async () => {
                    await revokeInvite(list.id);
                    setToken(null);
                  });
                }}
                className="shrink-0 text-xs text-subtle transition hover:text-brand"
              >
                Desactivar
              </button>
            )}
          </div>
        </>
      ) : isOwner ? (
        <button
          type="button"
          onClick={create}
          disabled={working}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
        >
          {working ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          Crear link de invitación
        </button>
      ) : (
        <p className="text-xs text-muted">No hay un link activo. Pedile a quien creó la lista que genere uno.</p>
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}

function RenameSection({ list }: { list: SharedList }) {
  const [state, formAction, saving] = useActionState(renameSharedList, EMPTY);
  const saved = Boolean(state.ok) && !saving;

  useEffect(() => {
    if (state.ok) posthog.capture("shared_list_renamed");
  }, [state]);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted">Nombre</h3>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="id" value={list.id} />
        <input className={emojiFieldClass} name="emoji" defaultValue={list.emoji ?? ""} maxLength={4} aria-label="Emoji" />
        <input className={`${fieldClass} min-w-0 flex-1`} name="name" defaultValue={list.name} maxLength={60} required />
        <button
          type="submit"
          disabled={saving}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-muted transition hover:border-ink hover:text-ink disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          Guardar
        </button>
      </form>
      {state.error && <p className="text-xs text-brand">{state.error}</p>}
    </section>
  );
}
