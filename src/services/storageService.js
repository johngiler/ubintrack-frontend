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

/** Totales de posiciones en todas las cavas (mismo scope/filtros de lista). */
export async function getCavaPositionTotals(search = "") {
  let url = "/api/cavas/totals/";
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
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

export async function getPositionNomenclature() {
  const response = await httpClient.get("/api/position-nomenclature/");
  return response.data;
}

export async function updatePositionNomenclature(data) {
  const response = await httpClient.patch("/api/position-nomenclature/", data);
  return response.data;
}

export async function generateCavaPositions(id) {
  const response = await httpClient.post(`/api/cavas/${id}/generate/`);
  return response.data;
}

export async function getCavaOccupancy(id) {
  const response = await httpClient.get(`/api/cavas/${id}/occupancy/`);
  return response.data;
}

export async function setHileraPush(id, { hall = "", racks = [], is_push }) {
  const response = await httpClient.post(`/api/cavas/${id}/set_hilera_push/`, {
    hall,
    racks,
    is_push: Boolean(is_push),
  });
  return response.data;
}

export async function getCavaGeneration(id) {
  const response = await httpClient.get(`/api/cavas/${id}/generation/`);
  return response.data;
}

/** Tokens de pasillo/túnel (P1, T1, …) usados en posiciones. */
export async function getPositionHalls({ cavaId } = {}) {
  const params = new URLSearchParams();
  if (cavaId) params.set("cava", String(cavaId));
  const qs = params.toString();
  const response = await httpClient.get(qs ? `/api/positions/halls/?${qs}` : "/api/positions/halls/");
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
    if (typeof filters.is_picking === "boolean") {
      url += `&is_picking=${filters.is_picking}`;
    }
    if (typeof filters.is_push === "boolean") {
      url += `&is_push=${filters.is_push}`;
    }
    if (filters.page_size) {
      url += `&page_size=${filters.page_size}`;
    }
  }
  const response = await httpClient.get(url);
  return response.data;
}

export async function getCellPositions({
  cavaId,
  hall = "",
  rack,
  place,
  places,
  page = 1,
}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "100",
    cava: String(cavaId),
    hall: hall ?? "",
    rack: String(rack ?? ""),
  });
  if (Array.isArray(places) && places.length) {
    params.set("place_in", places.map(String).join(","));
  } else if (place != null && place !== "") {
    params.set("place", String(place));
  }
  const response = await httpClient.get(`/api/positions/?${params.toString()}`);
  return response.data;
}

export async function getPositionMovements(positionId, page = 1, pageSize = 20) {
  const response = await httpClient.get(
    `/api/positions/${positionId}/movements/?page=${page}&page_size=${pageSize}`,
  );
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

export async function patchPosition(id, data) {
  const response = await httpClient.patch(`/api/positions/${id}/`, data);
  return response.data;
}

export async function deletePosition(id) {
  const response = await httpClient.delete(`/api/positions/${id}/`);
  return response.data;
}

function positionsListQuery(filters = {}, search = "") {
  const params = new URLSearchParams();
  if (search && search.trim() !== "") {
    params.set("search", search.trim());
  }
  if (filters.status) params.set("status", filters.status);
  if (filters.hall) params.set("hall", filters.hall);
  if (filters.cava_id) params.set("cava", String(filters.cava_id));
  if (typeof filters.is_active === "boolean") {
    params.set("is_active", String(filters.is_active));
  }
  if (typeof filters.is_picking === "boolean") {
    params.set("is_picking", String(filters.is_picking));
  }
  if (typeof filters.is_push === "boolean") {
    params.set("is_push", String(filters.is_push));
  }
  return params;
}

/** IDs del listado con los mismos filtros/búsqueda (sin paginar). */
export async function getPositionIds(filters = {}, search = "") {
  const params = positionsListQuery(filters, search);
  const qs = params.toString();
  const response = await httpClient.get(
    qs ? `/api/positions/ids/?${qs}` : "/api/positions/ids/",
  );
  return response.data;
}

export async function bulkDeletePositions(ids) {
  const response = await httpClient.delete("/api/positions/bulk-delete/", {
    data: { ids },
    timeout: 60000,
  });
  return response.data;
}

export async function bulkPrintPositions(
  ids,
  { perLabel = 1, samePositionCopies = false } = {},
) {
  const response = await httpClient.post(
    "/api/positions/bulk-print/",
    {
      ids,
      per_label: perLabel,
      same_position_copies: Boolean(samePositionCopies),
    },
    { timeout: 60000 },
  );
  return response.data;
}

export async function bulkRegeneratePositionTags(ids) {
  const response = await httpClient.post(
    "/api/positions/bulk-regenerate-tags/",
    { ids },
    { timeout: 60000 },
  );
  return response.data;
}

/** Cambia flags en masa. Solo enviar claves a aplicar: is_active, is_picking, is_push. */
export async function bulkUpdatePositionFlags(ids, flags = {}) {
  const payload = { ids };
  if (typeof flags.is_active === "boolean") payload.is_active = flags.is_active;
  if (typeof flags.is_picking === "boolean") payload.is_picking = flags.is_picking;
  if (typeof flags.is_push === "boolean") payload.is_push = flags.is_push;
  const response = await httpClient.post("/api/positions/bulk-update-flags/", payload, {
    timeout: 60000,
  });
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
