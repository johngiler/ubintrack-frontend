import httpClient from "./httpClient";

// Products
export async function getProducts(page = 1, filters = {}, search = "") {
  let url = `/api/products/?page=${page}`;

  if (filters.client) {
    url += `&client=${filters.client}`;
  }

  if (filters.category) {
    url += `&category=${filters.category}`;
  }
  if (filters.rotation_type) {
    url += `&rotation_type=${filters.rotation_type}`;
  }
  if (filters.condition) {
    url += `&condition=${filters.condition}`;
  }
  if (filters.is_picking) {
    url += `&is_picking=${filters.is_picking}`;
  }
  if (filters.is_active) {
    url += `&is_active=${filters.is_active}`;
  }

  if (search) {
    url += `&search=${search}`;
  }

  const response = await httpClient.get(url);
  return response.data;
}

/** Params de lista (filtros + search) para exports Excel. */
function listQueryParams(filters = {}, search = "") {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value != null) {
      params[key] = value;
    }
  });
  if (search) {
    params.search = search;
  }
  return params;
}

async function downloadExcelBlob(url, params, filename) {
  try {
    const response = await httpClient.get(url, {
      params,
      responseType: "blob",
    });

    const objectUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);

    return { success: true };
  } catch (error) {
    console.error("Error al descargar el archivo Excel:", error);
    return { success: false, error };
  }
}

export async function exportProductsToExcel({
  filters = {},
  search = "",
  filename = "Productos_export.xls",
} = {}) {
  return downloadExcelBlob(
    "/api/products/export_excel/",
    listQueryParams(filters, search),
    filename,
  );
}

export async function getProduct(id) {
  const response = await httpClient.get(`/api/products/${id}/`);
  return response.data;
}

export async function createProduct(data) {
  const response = await httpClient.post("/api/products/", data);
  return response.data;
}

export async function updateProduct(id, data) {
  const response = await httpClient.put(`/api/products/${id}/`, data);
  return response.data;
}

export async function deleteProduct(id) {
  const response = await httpClient.delete(`/api/products/${id}/`);
  return response.data;
}

// Categories
export async function getCategories() {
  const response = await httpClient.get("/api/categories/");
  return response.data;
}

// Bins
export async function getBins(page = 1, filters = {}, search = "") {
  let url = `/api/bins/?page=${page}`;

  if (filters.status) {
    url += `&status=${filters.status}`;
  }

  if (typeof filters.is_active === "boolean") {
    url += `&is_active=${filters.is_active}`;
  }

  if (search) {
    url += `&search=${search}`;
  }

  const response = await httpClient.get(url);
  return response.data;
}

export async function getBin(id) {
  const response = await httpClient.get(`/api/bins/${id}/`);
  return response.data;
}

export async function createBin(data) {
  const response = await httpClient.post("/api/bins/", data);
  return response.data;
}

export async function updateBin(id, data) {
  const response = await httpClient.put(`/api/bins/${id}/`, data);
  return response.data;
}

export async function deleteBin(id) {
  const response = await httpClient.delete(`/api/bins/${id}/`);
  return response.data;
}

export async function regenerateBinTag(binId) {
  const response = await httpClient.post(
    `/api/bins/${binId}/regenerate_tag/`
  );
  return response.data;
}

export async function printBinTag(binId) {
  const response = await httpClient.post(`/api/bins/${binId}/print/`);
  return response.data;
}

export async function getCriteriosAlmacenamiento() {
  const response = await httpClient.get("/api/bins/criterios-almacenamiento/");
  return response.data;
}

export async function almacenarBinsMasivo({
  binIds,
  strategy = "push",
  confirm = false,
  assignments = null,
  params = {},
} = {}) {
  try {
    const body = {
      strategy,
      bin_ids: binIds,
      confirm,
      params,
    };
    if (assignments) {
      body.assignments = assignments;
    }
    const response = await httpClient.post("/api/bins/almacenar-masivo/", body);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return {
        success: false,
        message:
          error.response.data.message || JSON.stringify(error.response.data),
      };
    }
    throw error;
  }
}

// Bin Products
export async function getBinProducts(filters = {}, search = "") {
  let url = `/api/bin-products/consolidated/?page_size=1000`;

  if (filters.client) {
    url += `&bin__client=${filters.client}`;
  }

  if (filters.status) {
    url += `&bin__status=${filters.status}`;
  }

  if (filters.exclude_exit_id) {
    url += `&exclude_exit_id=${filters.exclude_exit_id}`;
  }

  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  const response = await httpClient.get(url);
  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export async function getBinProduct(id) {
  const response = await httpClient.get(`/api/bin-products/${id}/`);
  return response.data;
}

export async function createBinProduct(data) {
  const response = await httpClient.post("/api/bin-products/", data);
  return response.data;
}

export async function updateBinProduct(id, data) {
  const response = await httpClient.put(`/api/bin-products/${id}/`, data);
  return response.data;
}

export async function deleteBinProduct(id) {
  const response = await httpClient.delete(`/api/bin-products/${id}/`);
  return response.data;
}

export async function exportBinsToExcel({
  filters = {},
  search = "",
  filename = "Bins_export.xls",
} = {}) {
  return downloadExcelBlob(
    "/api/bins/export_excel/",
    listQueryParams(filters, search),
    filename,
  );
}

// Bin Movements
export async function getBinMovements(binId) {
  const response = await httpClient.get(`/api/bins/${binId}/movements/`);
  return response.data;
}
