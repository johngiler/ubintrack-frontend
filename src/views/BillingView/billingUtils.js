export const BILLING_COLORS = {
  storage: "#06b6d4",
  entries: "#2563eb",
  exits: "#16a34a",
  picking: "#ea580c",
  services: "#7c3aed",
  bins: "#8b5cf6",
  avgPallet: "#6366f1",
  avgCapacity: "#ec4899",
};

export function formatBillingCurrency(value) {
  const num = parseFloat(value || 0);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Período por defecto: 27 del mes anterior al 26 del mes actual (o hoy). */
export function getDefaultBillingDates() {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 27);
  const day26 = new Date(today.getFullYear(), today.getMonth(), 26);
  const endDate = day26 > today ? today : day26;

  return {
    start: formatLocalDate(startDate),
    end: formatLocalDate(endDate),
  };
}

export function formatBillingDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
