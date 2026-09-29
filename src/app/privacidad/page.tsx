import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad · Wish Links",
  description: "Qué datos guarda Wish Links, para qué los usa y cómo podés borrarlos.",
};

const CONTACT_EMAIL = "calavarela2004@gmail.com";
const UPDATED = "29 de septiembre de 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      updated={UPDATED}
      intro={
        <>
          Wish Links es una lista personal donde guardás los links de lo que querés comprar. Esta
          página explica, en simple, qué datos guardamos, para qué los usamos y cómo podés
          borrarlos.
        </>
      }
    >
      <Section title="Quién es el responsable">
        <p>
          El equipo de Wish Links es responsable del tratamiento de tus datos. Para cualquier
          consulta sobre ellos,{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline">
            escribinos
          </a>
          .
        </p>
      </Section>

      <Section title="Qué datos guardamos">
        <List
          items={[
            <>
              <strong className="text-ink">Tu cuenta:</strong> tu email y tu contraseña. La
              contraseña se guarda cifrada; nosotros no podemos verla.
            </>,
            <>
              <strong className="text-ink">Lo que cargás:</strong> los links que guardás, con su
              título, descripción, precio, moneda, categoría, estado, notas y etiquetas, más las
              categorías que creás y las imágenes de los productos (las que subís o las que
              copiamos de la tienda para que no se pierdan).
            </>,
            <>
              <strong className="text-ink">Datos de uso:</strong> las páginas que visitás, los
              clics y las acciones dentro de la app (por ejemplo, agregar, editar o borrar un
              link, o usar un filtro), el tipo de dispositivo y navegador, y tu ubicación
              aproximada a partir de la dirección IP. Se asocian a tu usuario y a tu email.
            </>,
          ]}
        />
        <p>No grabamos tu pantalla, no usamos tus datos para publicidad y no los vendemos.</p>
      </Section>

      <Section title="Para qué los usamos">
        <List
          items={[
            "Para que la app funcione: iniciar sesión y mostrarte tu lista.",
            "Para entender cómo se usa la app y mejorarla.",
            "Para cuidar la seguridad del servicio y detectar errores.",
          ]}
        />
      </Section>

      <Section title="Con quién compartimos datos">
        <p>Usamos proveedores que procesan datos por nuestra cuenta:</p>
        <List
          items={[
            <>
              <strong className="text-ink">Supabase:</strong> guarda tu cuenta, tus links y tus
              imágenes. Los servidores están en São Paulo, Brasil.
            </>,
            <>
              <strong className="text-ink">Vercel:</strong> aloja el sitio.
            </>,
            <>
              <strong className="text-ink">PostHog:</strong> mide el uso de la app (Estados Unidos).
            </>,
            <>
              <strong className="text-ink">Google:</strong> para mostrar el ícono de cada tienda,
              tu navegador le pide a Google el ícono de ese sitio. Google recibe el dominio de la
              tienda y tu dirección IP.
            </>,
          ]}
        />
        <p>
          Cuando agregás un link, nuestro servidor visita esa página para leer su título e imagen.
          La tienda ve una visita de nuestro servidor, no tus datos personales.
        </p>
        <p>
          Por usar estos proveedores, tus datos pueden procesarse fuera de Argentina, en Brasil y
          en Estados Unidos.
        </p>
        <p>
          Si creás un link para compartir tu lista, cualquiera que lo tenga puede ver tus links
          pendientes (título, imagen, precio y tienda) sin iniciar sesión. No ve tu email, tus
          notas, tus etiquetas ni lo que ya compraste o descartaste. Podés desactivar el link
          cuando quieras desde «Compartir lista».
        </p>
      </Section>

      <Section title="Cookies y almacenamiento local">
        <p>
          Usamos cookies necesarias para mantener tu sesión iniciada, y PostHog guarda un
          identificador en tu navegador para reconocer tus visitas. No usamos cookies de
          publicidad.
        </p>
      </Section>

      <Section title="Cuánto tiempo los conservamos">
        <p>
          Mientras tengas la cuenta. Si la eliminás, se borran de inmediato tu usuario, tus links,
          tus categorías y tus imágenes. Los datos de uso que ya estén en PostHog los eliminamos
          cuando nos lo pedís por mail.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>Podés acceder a tus datos, corregirlos o pedir que los eliminemos.</p>
        <List
          items={[
            <>
              <strong className="text-ink">Eliminar tu cuenta y datos:</strong> desde la app, en
              el pie de la lista, con el botón «Eliminar mi cuenta». Es inmediato y no se puede
              deshacer.
            </>,
            <>
              <strong className="text-ink">Cualquier otro pedido</strong> (una copia de tus datos,
              corregir tu email, borrar tus datos de uso):{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline">
                escribinos
              </a>{" "}
              desde el mail con el que te registraste, para poder verificar que sos vos.
            </>,
          ]}
        />
        <p>
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso en
          forma gratuita a intervalos no inferiores a seis meses (Ley 25.326, art. 14). La Agencia
          de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326,
          tiene la atribución de atender las denuncias y reclamos que se interpongan con relación
          al incumplimiento de las normas sobre protección de datos personales.
        </p>
      </Section>

      <Section title="Seguridad">
        <p>
          La conexión al sitio está cifrada (HTTPS) y la base de datos está configurada para que
          cada usuario solo pueda ver y modificar sus propios datos, salvo lo que elijas mostrar
          con un link para compartir.
        </p>
      </Section>

      <Section title="Menores de edad">
        <p>Wish Links no está pensada para menores de 13 años.</p>
      </Section>

      <Section title="Cambios en esta política">
        <p>Si cambiamos algo importante, actualizamos esta página y la fecha de arriba.</p>
      </Section>

      <p className="mt-8 text-xs text-subtle">
        Ver también los{" "}
        <Link href="/terminos" className="underline hover:text-ink">
          términos y condiciones de uso
        </Link>
        .
      </p>
    </LegalPage>
  );
}
