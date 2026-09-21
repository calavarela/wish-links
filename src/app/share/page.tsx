import { redirect } from "next/navigation";
import { extractFirstUrl, normalizeUrlInput } from "@/lib/url";

/**
 * Destino del "Compartir" del celular. Android manda a veces el link dentro de
 * `text` (Instagram) en vez de `url`, así que se busca en los dos.
 */
export default async function SharePage(props: PageProps<"/share">) {
  const params = await props.searchParams;
  const pick = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? "";

  const candidate =
    normalizeUrlInput(pick(params.url)) ??
    extractFirstUrl(pick(params.text)) ??
    extractFirstUrl(pick(params.title));

  redirect(candidate ? `/?add=${encodeURIComponent(candidate)}` : "/");
}
