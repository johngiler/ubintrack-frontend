import httpClient from "./httpClient";

export async function getNavCounts() {
  const response = await httpClient.get("/api/nav/counts/");
  return response.data?.counts ?? {};
}
