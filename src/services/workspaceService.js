import httpClient from "./httpClient";

export async function getOwnerSettings() {
  const response = await httpClient.get("/api/me/workspace/");
  return response.data;
}

export async function updateOwnerSettings(data) {
  const response = await httpClient.patch("/api/me/workspace/", data);
  return response.data;
}
