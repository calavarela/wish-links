# Wish Links

Wishlist personal de links de distintas tiendas, en formato de tarjetas con vista previa
automática (título, imagen y precio), categorías, estados y búsqueda.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **Supabase**: Postgres con Row Level Security, Auth por email y Storage para las imágenes
- **Vercel** para el deploy

## Correr en local

```bash
npm install
npm run dev
```

Necesita un archivo `.env.local` (ver `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

## Cómo funciona

- `src/lib/preview.ts` lee la página del link y saca los datos de **Open Graph** y del
  **JSON-LD de tipo Product**. Si la tienda rechaza el navegador headless, reintenta con el
  user-agent del crawler de redes sociales, que muchas sí permiten (así funciona Mercado
  Libre). Si aun así no hay nada, la tarjeta se completa a mano.
- `src/lib/url.ts` limpia los parámetros de tracking (`utm_*`, `ref`, etc.) para guardar una
  URL canónica estable y detectar duplicados.
- Las imágenes de preview se **copian al Storage de Supabase**, así que la tarjeta se sigue
  viendo aunque la tienda borre el producto o bloquee el hotlinking.
- `src/proxy.ts` (antes `middleware`) refresca la sesión y protege las rutas privadas.
- Cada fila de `items` y `categories` está protegida por RLS: solo la ve su dueño.

## Base de datos

Las migraciones ya están aplicadas en el proyecto de Supabase:

| Tabla        | Para qué                                                              |
| ------------ | --------------------------------------------------------------------- |
| `categories` | Categorías del usuario, con emoji y orden                             |
| `items`      | Links guardados: url canónica, título, imagen, precio, estado, nota, tags |
| `share_links` | Links públicos de solo lectura (toda la lista o una categoría), con token aleatorio |

Al crearse un usuario nuevo, un trigger le carga las categorías iniciales
(Ropa, Tecno, Casa, Regalos, Otros).

## Compartir la lista

El botón **Compartir lista** crea un link `/w/<token>` (de toda la lista o de una categoría)
que se puede abrir sin cuenta. La página pública lee con la función `get_shared_wishlist`
(`security definer`), que devuelve solo los items **pendientes** y solo campos públicos: sin
notas, tags ni email. Las policies de `items` no cambian. Desactivar el link borra la fila y
el token deja de funcionar.

## Salida a las tiendas y afiliados

Las tarjetas no apuntan directo a la tienda sino a `/go/<id>` (o `/go/<id>?s=<token>` desde
una lista compartida). Esa ruta registra el clic (`items.last_opened_at`) y redirige al link
guardado, pasándolo antes por `src/lib/affiliate.ts`. Ahí hay una regla por programa de
afiliados, que se activa con su variable de entorno (por ahora `AMAZON_ASSOCIATE_TAG`). En la
base siempre queda el link original. La ruta solo redirige a URLs guardadas, así que no sirve
como redirección abierta.

## Historial de precios

Un Vercel Cron (`vercel.json`) llama una vez por día a `/api/cron/prices`, que vuelve a leer
la página de los items **pendientes** (primero los que hace más que no se revisan) con el
mismo `fetchPreview`. Si el precio cambió y está en la misma moneda, actualiza
`price_amount` y guarda el anterior en `previous_price_amount`: la tarjeta muestra el precio
nuevo con la etiqueta de % de suba o baja.

- Cada precio que tuvo un item queda en `price_history`, que escribe un trigger de `items`
  (también al crear el item y al editar el precio a mano). La usuaria solo puede leerla.
- Si el precio se edita a mano, otro trigger borra `previous_price_amount`: una corrección no
  es una baja de precio.
- El historial se ve al editar el item, cuando hubo al menos un cambio.
- La ruta pide `Authorization: Bearer $CRON_SECRET` y usa `SUPABASE_SERVICE_ROLE_KEY`
  (`src/lib/supabase/admin.ts`), así que las dos variables tienen que estar en Vercel.

## Notificaciones

La campanita del header abre los avisos de la tabla `notifications`. Hoy hay un solo tipo,
`price_drop`: lo crea el trigger `notify_price_drop` cuando el chequeo diario baja el precio
de un item pendiente (una edición a mano no avisa). Cada aviso guarda en `data` el precio
anterior, el nuevo y la moneda de ese momento, y hay uno solo sin leer por item. Al abrir el
panel se marcan como leídos. La usuaria puede leerlos, marcarlos y borrarlos, pero no crearlos.

## Guardar desde el celular

`public/manifest.json` declara un `share_target`: al instalar la web como app en Android,
Wish Links aparece en el menú **Compartir** de cualquier app y abre el formulario con el
link ya cargado.
