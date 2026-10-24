/**
 * Cookie que deja /auth/confirm cuando se entra con el link de recuperación:
 * mientras esté (y sea de esa usuaria), se puede poner contraseña nueva sin
 * escribir la actual. Aparte de las actions porque un archivo "use server"
 * solo puede exportar funciones.
 */
export const RECOVERY_COOKIE = "wl_password_recovery";

export const MIN_PASSWORD = 8;
