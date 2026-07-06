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

/** Colores de texto/ejes ApexCharts según tema (billing). */
export function getBillingApexTheme(isDark) {
  return {
    labelColor: isDark ? "#94a3b8" : "#64748b",
    dataLabelColor: isDark ? "#e2e8f0" : "#1e293b",
    gridColor: isDark ? "rgba(148, 163, 184, 0.12)" : "#f1f5f9",
    tooltipTheme: isDark ? "dark" : "light",
  };
}

/** Opciones ApexCharts compartidas en vistas de billing. */
export function billingApexChartDefaults(isDark) {
  const theme = getBillingApexTheme(isDark);
  return {
    theme,
    chart: { foreColor: theme.labelColor },
    legend: { labels: { colors: theme.labelColor } },
    tooltip: { theme: theme.tooltipTheme },
    grid: { borderColor: theme.gridColor, strokeDashArray: 4 },
    xaxis: {
      labels: { style: { colors: theme.labelColor, fontSize: "11px" } },
      axisBorder: { color: theme.gridColor },
      axisTicks: { color: theme.gridColor },
    },
    yaxis: {
      labels: { style: { colors: theme.labelColor, fontSize: "11px" } },
    },
    dataLabels: {
      style: {
        fontSize: "12px",
        fontWeight: 600,
        colors: [theme.dataLabelColor],
      },
    },
  };
}

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
