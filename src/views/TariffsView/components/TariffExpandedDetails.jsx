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
    accent: "text-sky-700",
    ring: "ring-sky-200/80",
    bg: "bg-sky-50/40",
    inPallet: "in_pallet_frozen",
    inFloor: "in_floor_frozen",
    out: "out_frozen",
    storage: "frozen_storage",
  },
  {
    key: "refrigerated",
    label: "Refrigerado",
    accent: "text-violet-700",
    ring: "ring-violet-200/80",
    bg: "bg-violet-50/40",
    inPallet: "in_pallet_refrigerated",
    inFloor: "in_floor_refrigerated",
    out: "out_refrigerated",
    storage: "refrigerated_storage",
  },
  {
    key: "dry",
    label: "Seco",
    accent: "text-amber-700",
    ring: "ring-amber-200/80",
    bg: "bg-amber-50/40",
    inPallet: "in_pallet_dry",
    inFloor: "in_floor_dry",
    out: "out_dry",
    storage: "dry_storage",
  },
];

const ADDITIONAL_SERVICES = [
  { key: "crossdocking", label: "Crossdocking" },
  { key: "restiba", label: "Restiba" },
  { key: "added_pallet", label: "Pallet adicional" },
  { key: "wrap", label: "Wrap/Strech" },
];

function ConditionCard({ section, tariff }) {
  const Icon = CONDITION_ICONS[section.key];

  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm ring-1 ${section.ring}`}
    >
      <header className={`mb-3 flex items-center gap-2 text-sm font-semibold ${section.accent}`}>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${section.bg}`}>
          <Icon className="h-4 w-4" />
        </span>
        {section.label}
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-500">Entrada pallet</dt>
          <dd className="font-medium text-slate-800">{formatTariffAmount(tariff[section.inPallet])}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Entrada piso</dt>
          <dd className="font-medium text-slate-800">{formatTariffAmount(tariff[section.inFloor])}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Salida</dt>
          <dd className="font-medium text-slate-800">{formatTariffAmount(tariff[section.out])}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Almacenaje/mes</dt>
          <dd className="font-medium text-slate-800">{formatTariffAmount(tariff[section.storage])}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function TariffExpandedDetails({ tariff }) {
  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {CONDITION_SECTIONS.map((section) => (
          <ConditionCard key={section.key} section={section} tariff={tariff} />
        ))}
      </div>

      <article className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-700">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
            <Wrench className="h-4 w-4" />
          </span>
          Servicios adicionales
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ADDITIONAL_SERVICES.map((service) => (
            <div key={service.key}>
              <p className="text-xs text-slate-500">{service.label}</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatTariffAmount(tariff[service.key])}
              </p>
            </div>
          ))}
        </div>

        {tariff.has_picking_tariff ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">Picking</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatTariffAmount(tariff.picking)} <span className="font-normal text-slate-500">/ caja</span>
            </p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
