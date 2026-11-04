"use client";

import { mutate } from "swr";

import { swrKeys } from "@/lib/swr/keys";

/** Vacía toda la caché SWR (logout / sesión inválida). Patrón PortPax. */
export async function clearSwrCache() {
  await mutate(() => true, undefined, { revalidate: false });
}

/** Revalida todas las entradas (p. ej. tras login). Patrón Publivalla. */
export async function invalidateAllSwrCache() {
  await mutate(() => true, undefined, { revalidate: true });
}

function revalidatePrefix(prefix) {
  return mutate(
    (key) => Array.isArray(key) && key[0] === prefix,
    undefined,
    { revalidate: true },
  );
}

export async function revalidateNavCounts() {
  await mutate(swrKeys.navCounts);
}

export async function revalidateNotifications() {
  await mutate(swrKeys.notificationsList);
  await mutate(swrKeys.notificationsUnread);
}

export async function revalidateClients() {
  await revalidatePrefix("clients");
  await revalidateNavCounts();
}

export async function revalidateProducts() {
  await revalidatePrefix("products");
  await mutate(swrKeys.categories);
  await revalidateNavCounts();
}

export async function revalidateBins() {
  await revalidatePrefix("bins");
  await revalidateNavCounts();
}

export async function revalidateEntries() {
  await revalidatePrefix("entries");
  await revalidateNavCounts();
}

export async function revalidateExits() {
  await revalidatePrefix("exits");
  await revalidateNavCounts();
}

export async function revalidatePositions() {
  await revalidatePrefix("positions");
  await revalidateNavCounts();
}

export async function revalidateStorages() {
  await revalidatePrefix("storages");
}

export async function revalidateCavas() {
  await revalidatePrefix("cavas");
}

export async function revalidateUsers() {
  await revalidatePrefix("users");
}

export async function revalidateProfiles() {
  await revalidatePrefix("profiles");
}

export async function revalidateTariffs() {
  await revalidatePrefix("tariffs");
  await mutate(swrKeys.tariffsAll);
}

export async function revalidateTasks() {
  await revalidatePrefix("tasks");
  await revalidatePrefix("trackings");
}

export async function revalidateDashboard() {
  await mutate(swrKeys.dashboardStats);
  await mutate(swrKeys.dashboardClients);
  await mutate(swrKeys.dashboardWarehouse);
}

export async function revalidateBilling() {
  await revalidatePrefix("billing-clients");
  await revalidatePrefix("client-billing");
  await revalidatePrefix("client-billing-history");
}
