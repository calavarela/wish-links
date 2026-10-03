"use client";

import { useCallback, useState, useTransition } from "react";
import { Bell, TrendingDown } from "lucide-react";
import posthog from "posthog-js";
import { clearNotifications, markNotificationsRead } from "@/app/actions";
import { formatPct, formatPrice, priceChangePct } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import Dialog from "./dialog";

export default function NotificationsButton({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  // Lo que estaba sin leer al abrir: se sigue resaltando aunque ya se haya marcado leído.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read_at);
  const close = useCallback(() => setOpen(false), []);

  function openPanel() {
    setFreshIds(new Set(unread.map((n) => n.id)));
    setOpen(true);
    posthog.capture("notifications_opened", { unread: unread.length });
    if (unread.length > 0) startTransition(() => markNotificationsRead());
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label={unread.length ? `Notificaciones (${unread.length} sin leer)` : "Notificaciones"}
        title="Notificaciones"
        className="relative flex items-center rounded-xl border border-line p-2 text-muted transition hover:border-ink hover:text-ink"
      >
        <Bell className="size-4" />
        {unread.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4.5 text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <Dialog open={open} onClose={close} title="Notificaciones">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Bell className="size-6 text-subtle" />
            <p className="text-sm text-muted">Todavía no hay avisos.</p>
            <p className="max-w-xs text-xs text-subtle">
              Revisamos los precios de tu lista todos los días y te avisamos acá cuando algo baja.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  fresh={freshIds.has(notification.id)}
                />
              ))}
            </ul>
            <div className="border-t border-line px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  startTransition(() => clearNotifications());
                }}
                className="text-xs text-subtle transition hover:text-ink"
              >
                Borrar todas
              </button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}

function NotificationRow({ notification, fresh }: { notification: AppNotification; fresh: boolean }) {
  const { item, data } = notification;
  const pct = priceChangePct(data.amount, data.previous_amount);
  const body = (
    <>
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {item?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="size-full object-cover" />
        ) : (
          <TrendingDown className="m-auto mt-3.5 size-5 text-subtle" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-xs text-muted">
          <span className="font-medium text-emerald-700">Bajó de precio</span>
          {pct !== null && <> · {formatPct(pct)}</>}
          {" · "}
          {timeAgo(notification.created_at)}
        </p>
        <p className="line-clamp-1 text-sm font-medium">{item?.title || item?.domain || "Producto borrado"}</p>
        <p className="text-xs">
          <span className="text-subtle line-through">{formatPrice(data.previous_amount, data.currency)}</span>{" "}
          <span className="font-semibold">{formatPrice(data.amount, data.currency)}</span>
        </p>
      </div>
      {fresh && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Nueva" />}
    </>
  );

  const className = `flex items-center gap-3 px-5 py-3 ${fresh ? "bg-brand-soft/60" : ""}`;

  return (
    <li>
      {item ? (
        <a
          href={`/go/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("notification_clicked", { type: notification.type, domain: item.domain })}
          className={`${className} transition hover:bg-stone-50`}
        >
          {body}
        </a>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
