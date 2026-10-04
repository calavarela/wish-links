import Link from "next/link";

/** Links legales. Cerrar sesión y eliminar la cuenta están en /perfil. */
export default function AccountFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 px-4 pb-8 text-xs text-subtle sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/terminos" className="transition hover:text-ink">
          Términos y condiciones
        </Link>
        <Link href="/privacidad" className="transition hover:text-ink">
          Política de privacidad
        </Link>
      </div>
      <p>© {new Date().getFullYear()} Wish Links</p>
    </footer>
  );
}
