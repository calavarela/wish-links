import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import {
  groupBy,
  inPeriod,
  lastTwelveMonths,
  toRows,
  totalsByCurrency,
  type Period,
  type Purchase,
} from "@/lib/spending";
import type { Category } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mis gastos · Wish Links",
};

const PERIODS: { value: Period; label: string; title: string }[] = [
  { value: "mes", label: "Este mes", title: "este mes" },
  { value: "anio", label: "Este año", title: "este año" },
  { value: "todo", label: "Todo", title: "en total" },
];

/** Cuánto se gastó en lo que se marcó como comprado (lista personal). */
export default async function SpendingPage(props: PageProps<"/gastos">) {
  const { periodo } = await props.searchParams;
  const period: Period = PERIODS.some((p) => p.value === periodo) ? (periodo as Period) : "anio";
  const supabase = await createClient();

  const [{ data: purchases }, { data: categories }] = await Promise.all([
    supabase
      .from("items")
      .select("id, title, domain, category_id, price_amount, price_currency, paid_amount, paid_currency, purchased_at, updated_at")
      .is("shared_list_id", null)
      .eq("status", "bought"),
    supabase.from("categories").select("id, name, emoji"),
  ]);

  const { rows: allRows, withoutPrice } = toRows((purchases ?? []) as Purchase[]);
  const rows = inPeriod(allRows, period);
  const totals = totalsByCurrency(rows);
  const main = totals[0]?.currency ?? totalsByCurrency(allRows)[0]?.currency ?? "ARS";
  const months = lastTwelveMonths(allRows, main);
  const byCategory = groupBy(rows, main, "category", (categories ?? []) as Category[]);
  const byStore = groupBy(rows, main, "store").slice(0, 5);
  const estimated = rows.filter((r) => r.estimated).length;
  const periodTitle = PERIODS.find((p) => p.value === period)!.title;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 sm:px-6">
      <Link href="/perfil" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Mi perfil
      </Link>

      <h1 className="mt-5 text-xl font-semibold tracking-tight">Mis gastos</h1>
      <p className="mt-1 text-sm text-muted">Lo que marcaste como comprado en tu lista.</p>

      <nav className="mt-4 flex gap-1.5" aria-label="Período">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={p.value === "anio" ? "/gastos" : `/gastos?periodo=${p.value}`}
            aria-current={p.value === period ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              p.value === period ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {allRows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <Receipt className="mb-3 size-6 text-subtle" />
          <p className="text-sm font-medium">Todavía no marcaste compras</p>
          <p className="mt-1 max-w-xs text-xs text-muted">
            Cuando compres algo de tu lista, marcalo como comprado (y si querés, cuánto pagaste) y lo vas a ver acá.
          </p>
        </div>
      ) : (
        <>
          {/* El número grande: no hace falta un gráfico para un solo total. */}
          <section className="mt-5 rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs text-subtle">Gastaste {periodTitle}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {totals.length ? formatPrice(totals[0].amount, totals[0].currency) : formatPrice(0, main)}
            </p>
            {totals.slice(1).map((t) => (
              <p key={t.currency} className="text-sm font-medium text-muted">
                + {formatPrice(t.amount, t.currency)}
              </p>
            ))}
            <p className="mt-2 text-xs text-muted">
              {rows.length} {rows.length === 1 ? "compra" : "compras"}
              {estimated > 0 && ` · ${estimated} con precio de lista (no cargaste lo que pagaste)`}
              {withoutPrice > 0 && period === "todo" && ` · ${withoutPrice} sin precio, no suman`}
            </p>
          </section>

          <MonthlyBars months={months} currency={main} />

          {byCategory.length > 0 && <Breakdown title="Por categoría" rows={byCategory} currency={main} />}
          {byStore.length > 0 && <Breakdown title="Por tienda" rows={byStore} currency={main} />}

          <section className="mt-6">
            <h2 className="mb-2 px-1 text-xs font-medium text-subtle">Compras</h2>
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
                No hay compras {periodTitle}.
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {rows.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{row.title}</p>
                      <p className="truncate text-[11px] text-subtle">
                        {formatDate(row.date)}
                        {row.domain && ` · ${row.domain}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{formatPrice(row.amount, row.currency)}</p>
                      {row.estimated && <p className="text-[10px] text-subtle">precio de lista</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Barras por mes (una sola serie, un solo color). El monto de cada mes va en el title y en el texto oculto. */
function MonthlyBars({ months, currency }: { months: { key: string; label: string; amount: number }[]; currency: string }) {
  const max = Math.max(...months.map((m) => m.amount));
  if (max === 0) return null;
  const current = months[months.length - 1];

  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium text-subtle">Últimos 12 meses</h2>
        <span className="text-[11px] text-subtle">en {currency}</span>
      </div>
      <ol className="mt-3 flex h-28 items-end gap-0.5" aria-label="Gasto por mes">
        {months.map((m) => {
          const height = m.amount > 0 ? Math.max(4, (m.amount / max) * 100) : 0;
          const value = formatPrice(m.amount, currency);
          return (
            <li key={m.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${m.label}: ${value}`}>
              <span className="sr-only">
                {m.label}: {value}
              </span>
              {/* Etiqueta solo en el mes más alto, para no llenar de números. */}
              {m.amount === max && <span className="text-[9px] font-medium text-muted">{compact(m.amount)}</span>}
              <div
                className={`w-full max-w-6 rounded-t ${m.amount > 0 ? "bg-ink group-hover:bg-stone-600" : ""}`}
                style={{ height: `${height}%` }}
              />
              <span className={`text-[9px] ${m.key === current.key ? "font-semibold text-ink" : "text-subtle"}`}>{m.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Breakdown({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: { label: string; amount: number; count: number }[];
  currency: string;
}) {
  const max = rows[0]?.amount || 1;
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-xs font-medium text-subtle">{title}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="shrink-0 font-medium">{formatPrice(row.amount, currency)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-ink" style={{ width: `${(row.amount / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 194900 → "195k", 1234567 → "1,2M": para la etiqueta chica arriba de la barra. */
function compact(amount: number): string {
  return new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
}
