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

## Promociones

`items.list_price_amount` guarda el precio de lista (tachado) cuando el producto está en
promo. Lo saca `fetchPreview` al agregar el link y el chequeo diario lo reescribe en cada
lectura buena, así una promo que terminó vuelve a `null`. Cómo se detecta según la tienda:

- **schema.org** (Tricot y cualquiera que lo use): un `priceSpecification` con
  `priceType` `StrikethroughPrice` o `ListPrice`.
- **Tiendanube**: con promo, el JSON-LD del producto trae el precio de lista y la meta
  `tiendanube:price` el que se paga. Solo cuenta si la oferta es de la misma URL, porque
  el JSON-LD también trae productos relacionados.
- **Shopify**: `compare_at_price` de `/products/<handle>.js` (en centavos), de la
  variante del link si tiene `?variant=`.

Mercado Libre bloquea la lectura, así que no se detecta. La tarjeta muestra la etiqueta
"Promo -X%" y el precio tachado, y el panel de filtros tiene "Solo en promo" (`?promo=1`).

## Códigos de descuento

La tabla `discount_codes` guarda códigos por tienda (`domain`, el mismo de `stores`), con
descripción y vencimiento opcionales. Se cruzan con los productos con `isSameStore`. En la
página de la tienda cada código muestra cuánto le queda ("Vence hoy · quedan 5 h", "Quedan
2 días") y los vencidos quedan al final, tachados; en las tarjetas solo se ofrecen los
vigentes. El vencimiento se cuenta en hora de Argentina (`src/lib/code-expiry.ts`).

- **Manuales** (`source = manual`): se cargan en la página de la tienda. Las policies solo
  dejan insertar con este origen.
- **Detectados** (`source = detected`): el chequeo diario lee la página principal de cada
  tienda que alguien tiene en su lista (productos pendientes o favoritas) y busca menciones
  tipo "15% OFF con el código HOLA15" (`src/lib/discount-codes.ts`). Es estricto a propósito:
  el código tiene que estar en mayúsculas y no ser una palabra de banner ("CUPÓN REGALO",
  "código postal"). Se renuevan en cada lectura buena y se borran si dejan de aparecer; los
  manuales no se tocan.

En la tarjeta, un chip con un ticket copia el código vigente de su tienda.

## Listas compartidas (colaborativas)

Aparte de las categorías personales: `/listas` muestra las listas de las que sos miembro y
deja crear una nueva; `/listas/<id>` es la lista, con sus productos por estado.

- `shared_lists` (nombre, emoji, `invite_token`) y `shared_list_members` (`owner` o
  `editor`). Un trigger suma a quien la crea como `owner`.
- Los productos de una lista tienen `items.shared_list_id`; `user_id` es quien lo agregó y
  no llevan categoría. La lista personal, /tiendas y el link público de solo lectura filtran
  `shared_list_id is null`.
- Las policies de `items` dejan ver y editar lo personal solo a su dueña y lo compartido a
  cualquier miembro (`is_list_member`, `security definer` para no caer en recursión de RLS).
  Solo la dueña renombra, borra la lista, maneja el link y saca gente; cada miembro puede
  salir.
- Invitación: la dueña genera un link `/unirse/<token>`. Quien lo abre inicia sesión o se
  registra (vuelve al link gracias a `next`), ve la lista con `preview_shared_list` y se suma
  con `join_shared_list`. Desactivar el link no saca a nadie.
- Una baja de precio en un producto compartido avisa a todos los miembros.

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
