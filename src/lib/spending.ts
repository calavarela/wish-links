import type { Category, Item } from "./types";

/** Lo que se necesita de un item comprado para el resumen de gastos. */
export type Purchase = Pick<
  Item,
  "id" | "title" | "domain" | "category_id" | "price_amount" | "price_currency" | "paid_amount" | "paid_currency" | "purchased_at" | "updated_at"
>;

export type Period = "mes" | "anio" | "todo";

export type SpendingRow = {
  id: string;
  title: string;
  domain: string | null;
  categoryId: string | null;
  amount: number;
  currency: string;
  /** No cargó lo que pagó: se usa el precio de lista. */
  estimated: boolean;
  date: string;
};

const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** "2026-10" en hora de Argentina. */
export function monthKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE }).slice(0, 7);
}

/** Lo pagado si lo cargó; si no, el precio de lista. Sin ninguno de los dos no suma. */
export function toRows(purchases: Purchase[]): { rows: SpendingRow[]; withoutPrice: number } {
  const rows: SpendingRow[] = [];
  let withoutPrice = 0;
  for (const p of purchases) {
    const paid = p.paid_amount !== null;
    const amount = paid ? p.paid_amount : p.price_amount;
    if (amount === null) {
      withoutPrice++;
      continue;
    }
    rows.push({
      id: p.id,
      title: p.title || p.domain || "Producto",
      domain: p.domain,
      categoryId: p.category_id,
      amount: Number(amount),
      currency: ((paid ? p.paid_currency : p.price_currency) ?? "ARS").toUpperCase(),
      estimated: !paid,
      date: p.purchased_at ?? p.updated_at,
    });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return { rows, withoutPrice };
}

export function inPeriod(rows: SpendingRow[], period: Period, now = new Date()): SpendingRow[] {
  if (period === "todo") return rows;
  const current = monthKey(now.toISOString());
  return rows.filter((row) => (period === "mes" ? monthKey(row.date) === current : monthKey(row.date).slice(0, 4) === current.slice(0, 4)));
}

/** Sumas por moneda, de la más usada a la menos. Sin cotización no se mezclan monedas. */
export function totalsByCurrency(rows: SpendingRow[]): { currency: string; amount: number; count: number }[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const row of rows) {
    const entry = map.get(row.currency) ?? { amount: 0, count: 0 };
    entry.amount += row.amount;
    entry.count++;
    map.set(row.currency, entry);
  }
  return [...map].map(([currency, v]) => ({ currency, ...v })).sort((a, b) => b.count - a.count || b.amount - a.amount);
}

/** Últimos 12 meses (incluido el actual), en la moneda principal, con los vacíos en 0. */
export function lastTwelveMonths(rows: SpendingRow[], currency: string, now = new Date()) {
  const months: { key: string; label: string; amount: number }[] = [];
  const [year, month] = monthKey(now.toISOString()).split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const date = new Date(Date.UTC(year, month - 1 - i, 15));
    const key = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", "");
    months.push({ key, label, amount: 0 });
  }
  for (const row of rows) {
    if (row.currency !== currency) continue;
    const slot = months.find((m) => m.key === monthKey(row.date));
    if (slot) slot.amount += row.amount;
  }
  return months;
}

/** Agrupa en la moneda principal por categoría o por tienda, de mayor a menor. */
export function groupBy(
  rows: SpendingRow[],
  currency: string,
  by: "category" | "store",
  categories: Pick<Category, "id" | "name" | "emoji">[] = [],
) {
  const map = new Map<string, { label: string; amount: number; count: number }>();
  for (const row of rows) {
    if (row.currency !== currency) continue;
    let key: string;
    let label: string;
    if (by === "category") {
      const category = categories.find((c) => c.id === row.categoryId);
      key = category?.id ?? "none";
      label = category ? `${category.emoji ? `${category.emoji} ` : ""}${category.name}` : "Sin categoría";
    } else {
      key = row.domain ?? "otras";
      label = row.domain ?? "Otras";
    }
    const entry = map.get(key) ?? { label, amount: 0, count: 0 };
    entry.amount += row.amount;
    entry.count++;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}
