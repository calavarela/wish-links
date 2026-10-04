"use client";

import { LogOut } from "lucide-react";
import posthog from "posthog-js";
import { signOut } from "@/app/actions";

export default function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => posthog.reset()}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-stone-50"
      >
        <LogOut className="size-4 text-muted" />
        Cerrar sesión
      </button>
    </form>
  );
}
