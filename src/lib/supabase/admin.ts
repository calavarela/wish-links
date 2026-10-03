import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role: saltea RLS. Solo para tareas del servidor sin
 * usuaria (el cron de precios), nunca en una ruta que responda a un pedido de ella.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
