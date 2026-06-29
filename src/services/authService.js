import httpClient from "./httpClient";

export async function login(credentials) {
  const response = await httpClient.post("/api/auth/login/", credentials);
  const { token, user } = response.data;
  return { token, user };
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
}
