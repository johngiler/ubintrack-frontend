import httpClient from "./httpClient";

export async function login(credentials) {
  const response = await httpClient.post("/api/auth/login/", credentials);
  const { token, user } = response.data;
  return { token, user };
}

export async function logout() {
  try {
    await httpClient.post("/api/auth/logout/");
  } catch {
    /* La sesión local se cierra aunque el API no responda. */
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
}
