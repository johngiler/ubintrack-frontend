import httpClient from "./httpClient";

export async function getMyProfile() {
  const response = await httpClient.get("/api/me/");
  return response.data;
}

/** @deprecated Usar getMyProfile */
export async function getWhoAmI() {
  return getMyProfile();
}

export async function updateMyProfile(data) {
  const response = await httpClient.patch("/api/me/", data);
  return response.data;
}

// Users (Administrador, Empleado, Cliente — unificado en CustomUser)
export async function getUsers(page = 1, search = "", filters = {}) {
  let url = `/api/users/?page=${page}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  if (filters.user_type) url += `&user_type=${filters.user_type}`;
  if (filters.client) url += `&client=${filters.client}`;
  if (filters.is_active !== undefined && filters.is_active !== "") {
    url += `&is_active=${filters.is_active}`;
  }
  if (filters.staff_only) {
    url += "&staff_only=1";
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getUser(id) {
  const response = await httpClient.get(`/api/users/${id}/`);
  return response.data;
}

export async function createUser(data) {
  const response = await httpClient.post("/api/users/", data);
  return response.data;
}

export async function updateUser(id, data) {
  const response = await httpClient.put(`/api/users/${id}/`, data);
  return response.data;
}

export async function deleteUser(id) {
  const response = await httpClient.delete(`/api/users/${id}/`);
  return response.data;
}

/** @deprecated Usar createUser con user_type: "cliente" */
export async function createClientUser(data) {
  return createUser({
    ...data,
    user_type: "cliente",
    password: data.password || data.plain_password,
  });
}

/** @deprecated Usar updateUser */
export async function updateClientUser(id, data) {
  return updateUser(id, {
    ...data,
    password: data.password || data.plain_password,
  });
}

/** @deprecated Usar deleteUser */
export async function deleteClientUser(id) {
  return deleteUser(id);
}

// Profiles
export async function getProfiles(page = 1, search = "", filters = {}, pageSize) {
  let url = `/api/profiles/?page=${page}`;
  if (pageSize) {
    url += `&page_size=${pageSize}`;
  }
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  if (filters.is_active !== undefined && filters.is_active !== "") {
    url += `&is_active=${filters.is_active}`;
  }
  if (filters.user_type) {
    url += `&user_type=${encodeURIComponent(filters.user_type)}`;
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getProfile(id) {
  const response = await httpClient.get(`/api/profiles/${id}/`);
  return response.data;
}

export async function createProfile(data) {
  const response = await httpClient.post("/api/profiles/", data);
  return response.data;
}

export async function updateProfile(id, data) {
  const response = await httpClient.put(`/api/profiles/${id}/`, data);
  return response.data;
}

export async function deleteProfile(id) {
  const response = await httpClient.delete(`/api/profiles/${id}/`);
  return response.data;
}

// Permissions
export async function getPermissions() {
  const response = await httpClient.get("/api/permissions/?page_size=1000");
  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.results) {
    let results = [...data.results];
    let next = data.next;
    while (next) {
      const pageResponse = await httpClient.get(next);
      const pageData = pageResponse.data;
      results = results.concat(pageData.results || []);
      next = pageData.next;
    }
    return results;
  }
  return [];
}

// Clients
export async function getClients(page = 1, search = "", filters = {}) {
  let url = `/api/clients/?page=${page}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  if (filters.is_active !== undefined && filters.is_active !== "") {
    url += `&is_active=${filters.is_active}`;
  }
  if (filters.tariff === "none") {
    url += "&sin_tarifa=1";
  } else if (filters.tariff) {
    url += `&tariff=${filters.tariff}`;
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getClient(id) {
  const response = await httpClient.get(`/api/clients/${id}/`);
  return response.data;
}

export async function createClient(data) {
  const response = await httpClient.post("/api/clients/", data);
  return response.data;
}

export async function updateClient(id, data) {
  const response = await httpClient.put(`/api/clients/${id}/`, data);
  return response.data;
}

export async function deleteClient(id) {
  const response = await httpClient.delete(`/api/clients/${id}/`);
  return response.data;
}

// Branches
export async function getBranches(clientId, search = "") {
  let url = "/api/branches/";
  if (clientId) {
    url += `?client=${clientId}`;
  }
  if (search) {
    url += `&search=${search}`;
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getBranch(id) {
  const response = await httpClient.get(`/api/branches/${id}/`);
  return response.data;
}

export async function createBranch(data) {
  const response = await httpClient.post("/api/branches/", data);
  return response.data;
}

export async function updateBranch(id, data) {
  const response = await httpClient.put(`/api/branches/${id}/`, data);
  return response.data;
}

export async function deleteBranch(id) {
  const response = await httpClient.delete(`/api/branches/${id}/`);
  return response.data;
}
