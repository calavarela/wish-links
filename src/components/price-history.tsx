"use client";

import { useEffect, useState } from "react";
import { formatDate, formatPct, formatPrice, priceChangePct } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { PriceHistoryEntry } from "@/lib/types";

const VISIBLE_ROWS = 6;

/** Evolución del precio de un item. No muestra nada hasta que haya al menos un cambio. */
export default function PriceHistory({ itemId, currency }: { itemId: string; currency: string | null }) {
  const [entries, setEntries] = useState<PriceHistoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("price_history")
      .select("id, item_id, amount, currency, recorded_at")
      .eq("item_id", itemId)
      .order("recorded_at")
      .then(({ data }) => {
        if (!cancelled) setEntries((data as PriceHistoryEntry[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // Un cambio de moneda corta la serie: solo se compara lo que está en la moneda actual.
  const series = (entries ?? []).filter((entry) => (entry.currency ?? currency) === currency);
  if (series.length < 2) return null;

  const amounts = series.map((entry) => Number(entry.amount));
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const rows = series
    .map((entry, index) => ({
      entry,
      pct: index > 0 ? priceChangePct(amounts[index], amounts[index - 1]) : null,
    }))
    .reverse()
    .slice(0, VISIBLE_ROWS);

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium text-muted">Historial de precio</h3>
        <span className="text-[11px] text-subtle">
          Mín. {formatPrice(min, currency)} · Máx. {formatPrice(max, currency)}
        </span>
      </div>

      <Sparkline values={amounts} />

      <ul className="flex flex-col gap-1">
        {rows.map(({ entry, pct }) => (
          <li key={entry.id} className="flex items-center gap-2 text-xs">
            <span className="text-subtle">{formatDate(entry.recorded_at)}</span>
            <span className="ml-auto font-medium">{formatPrice(Number(entry.amount), currency)}</span>
            <span
              className={`w-11 text-right text-[11px] ${
                pct === null ? "text-subtle" : pct < 0 ? "text-emerald-700" : "text-brand"
              }`}
            >
              {pct === null ? "—" : formatPct(pct)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 280;
  const height = 40;
  const pad = 3;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
      {/* Escalón: el precio se mantiene hasta el próximo cambio. */}
      <path
        d={points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `H${x}V${y}`)).join("")}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--color-ink)" />
    </svg>
  );
}
