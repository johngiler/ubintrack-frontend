import httpClient from "./httpClient";

// Entries
export async function getEntries(page = 1, filters = {}, search = "") {
  let url = `/api/entries/?page=${page}`;

  // Agregar filtros si existen
  if (filters.status) {
    url += `&status=${filters.status}`;
  }
  if (filters.condition) {
    url += `&condition=${filters.condition}`;
  }

  // Agregar término de búsqueda
  if (search) {
    url += `&search=${search}`;
  }

  const response = await httpClient.get(url);
  return response.data;
}

export async function getEntry(id) {
  const response = await httpClient.get(`/api/entries/${id}/`);
  return response.data;
}

export async function createEntry(data) {
  const response = await httpClient.post("/api/entries/", data);
  return response.data;
}

export async function updateEntry(id, data) {
  const response = await httpClient.put(`/api/entries/${id}/`, data);
  return response.data;
}

export async function patchEntry(id, data) {
  const response = await httpClient.patch(`/api/entries/${id}/`, data);
  return response.data;
}

export async function deleteEntry(id) {
  const response = await httpClient.delete(`/api/entries/${id}/`);
  return response.data;
}

export async function completeEntry(id, data) {
  const response = await httpClient.post(`/api/entries/${id}/complete/`, data);
  return response.data;
}

export async function regenerateEntryPdf(id) {
  const response = await httpClient.post(`/api/entries/${id}/regenerate_pdf/`);
  return response.data;
}

// Entry Products
export async function getEntryProducts(page = 1, filters = {}, search = "") {
  let url = `/api/entry-products/?page=${page}`;

  if (filters.entryId) {
    url += `&entry=${filters.entryId}`;
  }

  if (filters.is_completed) {
    url += `&is_completed=${filters.is_completed}`;
  }

  if (search) {
    url += `&search=${search}`;
  }

  const response = await httpClient.get(url);
  return response.data;
}

export async function getEntryProduct(id) {
  const response = await httpClient.get(`/api/entry-products/${id}/`);
  return response.data;
}

export async function createEntryProduct(data) {
  const response = await httpClient.post("/api/entry-products/", data);
  return response.data;
}

export async function updateEntryProduct(id, data) {
  const response = await httpClient.put(`/api/entry-products/${id}/`, data);
  return response.data;
}

export async function deleteEntryProduct(id) {
  const response = await httpClient.delete(`/api/entry-products/${id}/`);
  return response.data;
}

// Entry Details
export async function createEntryDetail(formData) {
  const response = await httpClient.post("/api/entry-details/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function updateEntryDetail(id, formData) {
  const response = await httpClient.put(`/api/entry-details/${id}/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function deleteEntryDetail(id) {
  const response = await httpClient.delete(`/api/entry-details/${id}/`);
  return response.data;
}

// Exits
export async function getExits(page = 1, filters = {}, search = "") {
  let url = `/api/exits/?page=${page}`;

  if (filters.status) {
    url += `&status=${filters.status}`;
  }

  if (filters.exit_date) {
    url += `&exit_date=${filters.exit_date}`;
  }

  if (search) {
    url += `&search=${search}`;
  }

  const response = await httpClient.get(url);
  return response.data;
}

export async function getExit(id) {
  const response = await httpClient.get(`/api/exits/${id}/`);
  return response.data;
}

export async function getExitMovements(exitId) {
  const response = await httpClient.get(`/api/exits/${exitId}/movements/`);
  return response.data;
}

export async function createExit(data) {
  const response = await httpClient.post("/api/exits/", data);
  return response.data;
}

export async function updateExit(id, data) {
  const response = await httpClient.put(`/api/exits/${id}/`, data);
  return response.data;
}

export async function completeExit(id) {
  const response = await httpClient.post(`/api/exits/${id}/complete/`);
  return response.data;
}

export async function deleteExit(id) {
  const response = await httpClient.delete(`/api/exits/${id}/`);
  return response.data;
}

// Exit Products
export async function getExitProducts(page = 1, filters = {}, search = "") {
  let url = `/api/exit-products/?page=${page}`;

  if (filters.exit_product_group__exit) {
    url += `&exit_product_group__exit=${filters.exit_product_group__exit}`;
  }

  if (filters.is_picking !== undefined) {
    url += `&is_picking=${filters.is_picking}`;
  }

  if (search) {
    url += `&search=${search}`;
  }

  const response = await httpClient.get(url);
  return response.data;
}

export async function createExitProduct(data) {
  const response = await httpClient.post("/api/exit-product-groups/", data);
  return response.data;
}

export async function updateExitProduct(id, data) {
  const response = await httpClient.put(`/api/exit-products/${id}/`, data);
  return response.data;
}

// Procesar todos los ExitProducts de un grupo de forma masiva
export async function processAllExitProducts(exitProductGroupId) {
  const response = await httpClient.post(
    `/api/exit-product-groups/${exitProductGroupId}/process-all/`
  );
  return response.data;
}

// Procesar ExitProduct de forma atómica (nuevo endpoint con transacciones)
export async function processExitProduct(id) {
  try {
    const response = await httpClient.post(`/api/exit-products/${id}/process/`);
    return response.data;
  } catch (error) {
    // Capturar el mensaje de error del backend
    if (error.response && error.response.data) {
      const responseData = error.response.data;

      // Extraer entry_id y entry_code de diferentes posibles ubicaciones
      let entry_id = null;
      let entry_code = null;

      // Buscar en el objeto de respuesta
      if (responseData.entry_id) {
        entry_id = responseData.entry_id;
      }
      if (responseData.entry_code) {
        entry_code = responseData.entry_code;
      }

      // Buscar en el mensaje si es un string JSON
      const message = responseData.message || JSON.stringify(responseData);
      if (!entry_id && message.includes("entry_id")) {
        const match = message.match(/entry_id['":\s]+(\d+)/);
        entry_id = match ? match[1] : null;
      }
      if (!entry_code && message.includes("entry_code")) {
        const match = message.match(/entry_code['":\s]+['"]?([A-Z0-9-]+)/i);
        entry_code = match ? match[1] : null;
      }

      return {
        success: false,
        message: message,
        data: {
          ...responseData,
          entry_id,
          entry_code,
        },
      };
    }
    throw error;
  }
}

// Revertir ExitProduct procesado (solo admin)
export async function reverseExitProduct(id) {
  try {
    const response = await httpClient.post(`/api/exit-products/${id}/reverse/`);
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

// Reasignar ExitProduct a otro bin sin procesar
export async function reassignExitProduct(id) {
  try {
    const response = await httpClient.post(
      `/api/exit-products/${id}/reassign/`
    );
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

// Reemplazar bin de ExitProduct mediante código QR escaneado
export async function replaceExitProductBin(id, newBinCode) {
  try {
    const response = await httpClient.post(
      `/api/exit-products/${id}/replace-bin/`,
      { new_bin_code: newBinCode }
    );
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

export async function deleteExitProduct(id) {
  const response = await httpClient.delete(`/api/exit-product-groups/${id}/`);
  return response.data;
}

export async function deleteExitProductBin(id) {
  const response = await httpClient.delete(`/api/exit-products/${id}/`);
  return response.data;
}

// Exit Details
export async function createExitDetail(data) {
  const response = await httpClient.post("/api/exit-details/", data);
  return response.data;
}

export async function updateExitDetail(id, data) {
  const response = await httpClient.put(`/api/exit-details/${id}/`, data);
  return response.data;
}

export async function deleteExitDetail(id) {
  const response = await httpClient.delete(`/api/exit-details/${id}/`);
  return response.data;
}

// Export Excel - Entries
export async function exportEntryOrdersToExcel({
  filters = {},
  search = "",
  filename = "Ordenes_Entrada.xls",
} = {}) {
  try {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) params[key] = value;
    });
    if (search) params.search = search;

    const response = await httpClient.get("/api/entries/export_excel/", {
      params,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error al descargar el archivo Excel:", error);
    return { success: false, error };
  }
}

// Export Excel - Exits
export async function exportExitOrdersToExcel({
  filters = {},
  search = "",
  filename = "Ordenes_Salida.xls",
} = {}) {
  try {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) params[key] = value;
    });
    if (search) params.search = search;

    const response = await httpClient.get("/api/exits/export_excel/", {
      params,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Error al descargar el archivo Excel:", error);
    return { success: false, error };
  }
}

// Validar Excel para importación de salidas
export async function validateExitImport(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await httpClient.post(
    "/api/exits/validate-import/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

// Importar salidas desde Excel
export async function importExitsFromExcel(file, exitDate = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (exitDate) {
    formData.append("exit_date", exitDate);
  }

  const response = await httpClient.post("/api/exits/import/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
