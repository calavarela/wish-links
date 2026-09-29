"use client";

import type { ReactNode } from "react";
import posthog from "posthog-js";

/**
 * Link de una tarjeta en la lista compartida. Quien la mira no tiene cuenta, así
 * que el clic solo se mide en PostHog (sin el token, que es lo que da acceso).
 */
export default function SharedItemLink({
  href,
  domain,
  hasPrice,
  scope,
  className,
  children,
}: {
  href: string;
  domain: string | null;
  hasPrice: boolean;
  scope: "all" | "category";
  className?: string;
  children: ReactNode;
}) {
  function track() {
    posthog.capture("shared_item_opened", { domain, has_price: hasPrice, share_scope: scope });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={track}
      onAuxClick={(event) => {
        if (event.button === 1) track();
      }}
    >
      {children}
    </a>
  );
}
