/** Inactivo tras 5 minutos sin interacción. Una pestaña oculta cuenta como inactiva. */
export const PRESENCE_IDLE_MS = 5 * 60 * 1000;

export function presenceStatus(user) {
  return user?.status === "idle" ? "idle" : "active";
}
