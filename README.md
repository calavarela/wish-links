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

Al crearse un usuario nuevo, un trigger le carga las categorías iniciales
(Ropa, Tecno, Casa, Regalos, Otros).

## Guardar desde el celular

`public/manifest.json` declara un `share_target`: al instalar la web como app en Android,
Wish Links aparece en el menú **Compartir** de cualquier app y abre el formulario con el
link ya cargado.
