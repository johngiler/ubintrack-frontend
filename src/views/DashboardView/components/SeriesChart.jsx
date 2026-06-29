"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/bootstrap";
import { Card } from "@/components/ui/Card";
import { MONTH_LABELS } from "../dashboardUtils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_MODE_KEY = "dashboard_chart_mode";

export default function SeriesChart({ charts }) {
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

  const switchMode = (mode) => {
    setChartMode(mode);
    localStorage.setItem(CHART_MODE_KEY, mode);
  };

  return (
    <Card>
      <Card.Header className="border-b border-slate-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
          {chartMode === "monthly" ? "Series mensuales" : "Series diarias (últimos 7 días)"}
        </h2>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
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
            options={{
              chart: { type: "area", toolbar: { show: false }, parentHeightOffset: 0 },
              colors: ["#4169e1", "#20c997", "#ffa500"],
              dataLabels: { enabled: false },
              stroke: { curve: "smooth", width: 3 },
              fill: {
                type: "gradient",
                gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] },
              },
              grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
              xaxis: {
                categories,
                tickPlacement: "on",
                labels: { style: { colors: "#64748b", fontSize: "11px" } },
              },
              yaxis: { min: 0, labels: { style: { colors: "#64748b", fontSize: "11px" } } },
              legend: { position: "top", horizontalAlign: "center", offsetY: -4, fontSize: "12px" },
              tooltip: { theme: "light" },
            }}
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-slate-400">
            Sin datos de series disponibles
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
