/** Identificador embebido en el build de Next. */
export function getLocalAppBuildId() {
  const value = process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim();
  return value || "local-dev";
}
