"use client";

import { Snowflake, Sun, Thermometer, Wrench } from "lucide-react";

import { formatTariffAmount } from "../tariffLabels";

const CONDITION_ICONS = {
  frozen: Snowflake,
  refrigerated: Thermometer,
  dry: Sun,
};

const CONDITION_SECTIONS = [
  {
    key: "frozen",
    label: "Congelado",
    accent: "text-sky-700 dark:text-sky-400",
    ring: "ring-sky-200/80 dark:ring-sky-500/20",
    bg: "bg-sky-50/40 dark:bg-sky-500/10",
    inPallet: "in_pallet_frozen",
    inFloor: "in_floor_frozen",
    out: "out_frozen",
    storage: "frozen_storage",
  },
  {
    key: "refrigerated",
    label: "Refrigerado",
    accent: "text-violet-700 dark:text-violet-400",
    ring: "ring-violet-200/80 dark:ring-violet-500/20",
    bg: "bg-violet-50/40 dark:bg-violet-500/10",
    inPallet: "in_pallet_refrigerated",
    inFloor: "in_floor_refrigerated",
    out: "out_refrigerated",
    storage: "refrigerated_storage",
  },
  {
    key: "dry",
    label: "Seco",
    accent: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-200/80 dark:ring-amber-500/20",
    bg: "bg-amber-50/40 dark:bg-amber-500/10",
    inPallet: "in_pallet_dry",
    inFloor: "in_floor_dry",
    out: "out_dry",
    storage: "dry_storage",
  },
];

const ADDITIONAL_SERVICES = [
  { key: "restiba", label: "Restiba" },
  { key: "added_pallet", label: "Pallet adicional" },
  { key: "wrap", label: "Wrap/Strech" },
];

function ConditionCard({ section, tariff }) {
  const Icon = CONDITION_ICONS[section.key];

  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm ring-1 dark:border-slate-700/60 dark:bg-[var(--surface)] ${section.ring}`}
    >
      <header className={`mb-3 flex items-center gap-2 text-sm font-semibold ${section.accent}`}>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${section.bg}`}>
          <Icon className="h-4 w-4" />
        </span>
        {section.label}
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Entrada pallet</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {formatTariffAmount(tariff[section.inPallet])}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Entrada piso</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {formatTariffAmount(tariff[section.inFloor])}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Salida</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {formatTariffAmount(tariff[section.out])}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Almacenaje/mes</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {formatTariffAmount(tariff[section.storage])}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function TariffExpandedDetails({ tariff }) {
  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/30">
      <div className="grid gap-3 lg:grid-cols-3">
        {CONDITION_SECTIONS.map((section) => (
          <ConditionCard key={section.key} section={section} tariff={tariff} />
        ))}
      </div>

      <article className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700/60 dark:bg-[var(--surface)]">
        <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-400">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/15">
            <Wrench className="h-4 w-4" />
          </span>
          Servicios adicionales
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ADDITIONAL_SERVICES.map((service) => (
            <div key={service.key}>
              <p className="text-xs text-slate-500 dark:text-slate-400">{service.label}</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {formatTariffAmount(tariff[service.key])}
              </p>
            </div>
          ))}
        </div>

        {tariff.has_picking_tariff ? (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Picking</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {formatTariffAmount(tariff.picking)}{" "}
              <span className="font-normal text-slate-500 dark:text-slate-400">/ caja</span>
            </p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
