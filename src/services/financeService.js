import httpClient from "./httpClient";

// Tariffs
export async function getTariffs(page = 1, search = "", filters = {}) {
  let url = `/api/tariffs/?page=${page}&page_size=100`;

  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  
  if (filters.has_picking_tariff !== undefined && filters.has_picking_tariff !== "") {
    url += `&has_picking_tariff=${filters.has_picking_tariff}`;
  }
  
  const response = await httpClient.get(url);
  return response.data;
}

export async function getTariff(id) {
  const response = await httpClient.get(`/api/tariffs/${id}/`);
  return response.data;
}

export async function createTariff(data) {
  const response = await httpClient.post("/api/tariffs/", data);
  return response.data;
}

export async function updateTariff(id, data) {
  const response = await httpClient.put(`/api/tariffs/${id}/`, data);
  return response.data;
}

export async function deleteTariff(id) {
  const response = await httpClient.delete(`/api/tariffs/${id}/`);
  return response.data;
}

// Billing Calculations - Ahora usa start_date y end_date en lugar de period
export async function getBillingSummary(startDate, endDate) {
  const response = await httpClient.get(
    `/api/billing/summary/?start_date=${startDate}&end_date=${endDate}`
  );
  return response.data;
}

export async function getBillingClients(
  page = 1,
  pageSize = 20,
  startDate,
  endDate
) {
  const response = await httpClient.get(
    `/api/billing/clients/?page=${page}&page_size=${pageSize}&start_date=${startDate}&end_date=${endDate}`
  );
  return response.data;
}

export async function calculateClientBilling(clientId, startDate, endDate) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/calculate/?start_date=${startDate}&end_date=${endDate}`
  );
  return response.data;
}

export async function getClientBillingHistory(clientId, months = 12) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/history/?months=${months}`
  );
  return response.data;
}

// Inventory Averages - Integrado en billing
export async function getInventoryAverage(
  clientId,
  startDate,
  endDate,
  storageType = "all"
) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/average/?start_date=${startDate}&end_date=${endDate}&storage_type=${storageType}`
  );
  return response.data;
}

export async function exportInventoryAverageExcel(
  clientId,
  startDate,
  endDate,
  storageType = "all"
) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/average/export/?start_date=${startDate}&end_date=${endDate}&storage_type=${storageType}`,
    { responseType: "blob" }
  );
  return response.data;
}

// Exportar reporte de facturación completo (Excel con 4 pestañas)
export async function exportBillingReport(clientId, startDate, endDate) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/billing-report/export/?start_date=${startDate}&end_date=${endDate}`,
    { responseType: "blob" }
  );
  return response.data;
}

// Comprobantes (Invoices)
export async function getNextInvoiceNumber(clientId) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/invoice/next-number/`
  );
  return response.data;
}

export async function generateInvoice(clientId, startDate, endDate, invoiceData) {
  const response = await httpClient.post(
    `/api/billing/${clientId}/invoice/generate/?start_date=${startDate}&end_date=${endDate}`,
    invoiceData,
    { responseType: "blob" }
  );
  return response.data;
}

export async function getClientInvoices(clientId) {
  const response = await httpClient.get(
    `/api/billing/${clientId}/invoices/`
  );
  return response.data;
}
