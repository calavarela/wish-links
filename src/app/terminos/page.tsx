import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones · Wish Links",
  description: "Las reglas de uso de Wish Links: qué es el servicio, qué podés hacer y qué no.",
};

const CONTACT_EMAIL = "calavarela2004@gmail.com";
const UPDATED = "28 de septiembre de 2026";

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones de uso"
      updated={UPDATED}
      intro={
        <>
          Estos términos son el acuerdo entre vos y Wish Links para usar la app. Al crear una
          cuenta o usar el servicio, los aceptás. Si no estás de acuerdo, no lo uses.
        </>
      }
    >
      <Section title="Qué es Wish Links">
        <p>
          Wish Links es una herramienta gratuita para guardar, organizar y compartir links de
          productos que te interesa comprar. No vendemos productos, no procesamos pagos ni somos
          parte de ninguna compra que hagas en las tiendas cuyos links guardás.
        </p>
      </Section>

      <Section title="Tu cuenta">
        <List
          items={[
            "Necesitás un email y una contraseña para usar la app. Sos responsable de mantenerlos a salvo y de todo lo que pase en tu cuenta.",
            "La información que nos das (como tu email) tiene que ser real y actualizada.",
            "Wish Links no está pensada para menores de 13 años.",
            <>
              Podés eliminar tu cuenta cuando quieras desde la app. Ver la{" "}
              <Link href="/privacidad" className="text-ink underline">
                política de privacidad
              </Link>{" "}
              para el detalle de qué se borra.
            </>,
          ]}
        />
      </Section>

      <Section title="Uso permitido">
        <p>No podés usar Wish Links para:</p>
        <List
          items={[
            "Actividades ilegales, o guardar contenido que infrinja derechos de terceros.",
            "Intentar acceder a cuentas o datos de otras personas.",
            "Sobrecargar el servicio a propósito, automatizar el uso masivo de la app o intentar evadir sus límites técnicos.",
            "Hacer ingeniería inversa del servicio o intentar extraer su código fuente más allá de lo que la ley permite.",
          ]}
        />
        <p>
          Podemos suspender o eliminar cuentas que incumplan estas reglas o que representen un
          riesgo para el servicio o para otras personas usuarias.
        </p>
      </Section>

      <Section title="Lo que guardás en la app">
        <p>
          Los links, imágenes, notas y categorías que cargás son tuyos. Nos das permiso para
          guardarlos y mostrártelos a vos, únicamente para que la app funcione. No los revisamos
          antes de que se guarden, y no nos hacemos responsables de lo que un usuario decida
          guardar.
        </p>
      </Section>

      <Section title="Links a otras tiendas">
        <p>
          Wish Links solo guarda una referencia a un producto: el link, y un título, precio e
          imagen que leemos de la página de la tienda en el momento de agregarlo. No controlamos
          esas tiendas ni verificamos que el precio, la disponibilidad o el contenido sigan siendo
          los mismos después. Comprar a través de un link guardado es una relación directa entre
          vos y esa tienda; Wish Links no participa ni responde por esas compras.
        </p>
      </Section>

      <Section title="El servicio tal como está">
        <List
          items={[
            "Wish Links es un servicio gratuito, ofrecido “tal como está”, sin garantías de disponibilidad continua ni de que vaya a estar libre de errores.",
            "Podemos cambiar, agregar o sacar funciones, y podemos interrumpir el servicio, en cualquier momento.",
            "No garantizamos que las vistas previas de los productos (título, precio, imagen) sean siempre exactas: dependen de lo que cada tienda publica.",
          ]}
        />
      </Section>

      <Section title="Límite de responsabilidad">
        <p>
          En la medida que lo permita la ley, Wish Links no es responsable por daños indirectos,
          pérdida de datos por causas fuera de nuestro control, ni por decisiones de compra que
          tomes en base a la información guardada en la app.
        </p>
      </Section>

      <Section title="Cambios en estos términos">
        <p>
          Si cambiamos algo importante, actualizamos esta página y la fecha de arriba. Seguir
          usando la app después de un cambio implica que lo aceptás.
        </p>
      </Section>

      <Section title="Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Cualquier conflicto se
          resuelve ante los tribunales ordinarios competentes.
        </p>
      </Section>

      <Section title="Contacto">
        <p>
          Para cualquier consulta sobre estos términos,{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline">
            escribinos
          </a>
          .
        </p>
      </Section>

      <p className="mt-8 text-xs text-subtle">
        Ver también la{" "}
        <Link href="/privacidad" className="underline hover:text-ink">
          política de privacidad
        </Link>
        .
      </p>
    </LegalPage>
  );
}
