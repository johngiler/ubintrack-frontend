import httpClient from "./httpClient";

// Storages
export async function getStorages(page = 1, search = "", pageSize = 20) {
  let url = `/api/storages/?page=${page}&page_size=${pageSize}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getStorage(id) {
  const response = await httpClient.get(`/api/storages/${id}/`);
  return response.data;
}

export async function createStorage(data) {
  const response = await httpClient.post("/api/storages/", data);
  return response.data;
}

export async function updateStorage(id, data) {
  const response = await httpClient.put(`/api/storages/${id}/`, data);
  return response.data;
}

export async function deleteStorage(id) {
  const response = await httpClient.delete(`/api/storages/${id}/`);
  return response.data;
}

// Cavas
export async function getCavas(page = 1, search = "", pageSize = 20) {
  let url = `/api/cavas/?page=${page}&page_size=${pageSize}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getCava(id) {
  const response = await httpClient.get(`/api/cavas/${id}/`);
  return response.data;
}

export async function createCava(data) {
  const response = await httpClient.post("/api/cavas/", data);
  return response.data;
}

export async function updateCava(id, data) {
  const response = await httpClient.put(`/api/cavas/${id}/`, data);
  return response.data;
}

export async function deleteCava(id) {
  const response = await httpClient.delete(`/api/cavas/${id}/`);
  return response.data;
}

// Positions
export async function getPositions(page = 1, filters = {}, search = "") {
  // Construir la URL base
  let url = `/api/positions/?page=${page}`;

  // Añadir parámetros de búsqueda si existen
  if (search && search.trim() !== "") {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }

  // Añadir filtros si existen
  if (filters) {
    if (filters.status) {
      url += `&status=${encodeURIComponent(filters.status)}`;
    }
    if (filters.hall) {
      url += `&hall=${encodeURIComponent(filters.hall)}`;
    }
    if (filters.cava_id) {
      url += `&cava=${encodeURIComponent(filters.cava_id)}`;
    }
    if (typeof filters.is_active === "boolean") {
      url += `&is_active=${filters.is_active}`;
    }
    if (filters.page_size) {
      url += `&page_size=${filters.page_size}`;
    }
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getPosition(id) {
  const response = await httpClient.get(`/api/positions/${id}/`);
  return response.data;
}

export async function createPosition(data) {
  const response = await httpClient.post("/api/positions/", data);
  return response.data;
}

export async function updatePosition(id, data) {
  const response = await httpClient.put(`/api/positions/${id}/`, data);
  return response.data;
}

export async function deletePosition(id) {
  const response = await httpClient.delete(`/api/positions/${id}/`);
  return response.data;
}

export async function printPosition(id) {
  const response = await httpClient.post(`/api/positions/${id}/print/`);
  return response.data;
}

export async function regeneratePositionTag(id) {
  const response = await httpClient.post(
    `/api/positions/${id}/regenerate_tag/`
  );
  return response.data;
}
