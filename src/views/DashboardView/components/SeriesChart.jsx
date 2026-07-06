"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/bootstrap";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/context/ThemeContext";
import { MONTH_LABELS } from "../dashboardUtils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_MODE_KEY = "dashboard_chart_mode";

export default function SeriesChart({ charts }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [chartMode, setChartMode] = useState("monthly");

  useEffect(() => {
    const saved = localStorage.getItem(CHART_MODE_KEY);
    if (saved === "daily" || saved === "monthly") setChartMode(saved);
  }, []);

  const { categories, series } = useMemo(() => {
    const isMonthly = chartMode === "monthly";
    const source = isMonthly ? charts?.monthly || [] : charts?.daily || [];

    const cats = isMonthly
      ? source.map((item) => {
          const [, month] = item.month.split("-");
          return MONTH_LABELS[parseInt(month, 10) - 1] || item.month;
        })
      : source.map((item) => item.day);

    return {
      categories: cats,
      series: [
        { name: "Entradas", data: source.map((item) => item.entries) },
        { name: "Salidas", data: source.map((item) => item.exits) },
        { name: "Bins", data: source.map((item) => item.bins) },
      ],
    };
  }, [chartMode, charts]);

  const chartOptions = useMemo(() => {
    const labelColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.12)" : "#f1f5f9";

    return {
      chart: { type: "area", toolbar: { show: false }, parentHeightOffset: 0, foreColor: labelColor },
      colors: ["#4169e1", "#20c997", "#ffa500"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: isDark ? 0.25 : 0.35,
          opacityTo: isDark ? 0.02 : 0.05,
          stops: [0, 90, 100],
        },
      },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      xaxis: {
        categories,
        tickPlacement: "on",
        labels: { style: { colors: labelColor, fontSize: "11px" } },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor },
      },
      yaxis: {
        min: 0,
        labels: { style: { colors: labelColor, fontSize: "11px" } },
      },
      legend: {
        position: "top",
        horizontalAlign: "center",
        offsetY: -4,
        fontSize: "12px",
        labels: { colors: labelColor },
      },
      tooltip: { theme: isDark ? "dark" : "light" },
    };
  }, [categories, isDark]);

  const switchMode = (mode) => {
    setChartMode(mode);
    localStorage.setItem(CHART_MODE_KEY, mode);
  };

  return (
    <Card>
      <Card.Header className="border-b border-slate-100 dark:border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-[var(--foreground)]">
          {chartMode === "monthly" ? "Series mensuales" : "Series diarias (últimos 7 días)"}
        </h2>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-[var(--border-subtle)] dark:bg-[var(--surface)]">
          <Button
            variant={chartMode === "daily" ? "primary" : "ghost"}
            size="sm"
            className="!h-7 !px-2.5 text-xs"
            onClick={() => switchMode("daily")}
          >
            Diario
          </Button>
          <Button
            variant={chartMode === "monthly" ? "primary" : "ghost"}
            size="sm"
            className="!h-7 !px-2.5 text-xs"
            onClick={() => switchMode("monthly")}
          >
            Mensual
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="!px-2 !pb-2 !pt-4">
        {categories.length ? (
          <ReactApexChart
            type="area"
            height={350}
            width="100%"
            series={series}
            options={chartOptions}
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-slate-400 dark:text-[var(--foreground-muted)]">
            Sin datos de series disponibles
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
