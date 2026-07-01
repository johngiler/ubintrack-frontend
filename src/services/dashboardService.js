import httpClient from "./httpClient";

export async function getDashboardStats() {
  const response = await httpClient.get("/api/dashboard/stats/");
  return response.data;
}

export async function getWarehouseStructure() {
  try {
    const response = await httpClient.get("/api/warehouse/structure/");
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "success" in data) {
      return data;
    }
    throw error;
  }
}

export async function getClientStats() {
  const response = await httpClient.get("/api/dashboard/client-stats/");
  return response.data;
}
