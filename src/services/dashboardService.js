import httpClient from "./httpClient";

export async function getDashboardStats() {
  const response = await httpClient.get("/api/dashboard/stats/");
  return response.data;
}

export async function getWarehouseStructure() {
  const response = await httpClient.get("/api/warehouse/structure/");
  return response.data;
}

export async function getClientStats() {
  const response = await httpClient.get("/api/dashboard/client-stats/");
  return response.data;
}
