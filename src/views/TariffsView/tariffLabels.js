export const EMPTY_TARIFF = {
  name: "",
  in_pallet_frozen: "0.00",
  in_floor_frozen: "0.00",
  out_frozen: "0.00",
  in_pallet_refrigerated: "0.00",
  in_floor_refrigerated: "0.00",
  out_refrigerated: "0.00",
  in_pallet_dry: "0.00",
  in_floor_dry: "0.00",
  out_dry: "0.00",
  refrigerated_storage: "0.00",
  frozen_storage: "0.00",
  dry_storage: "0.00",
  picking: "0.00",
  has_picking_tariff: false,
  restiba: "0.00",
  added_pallet: "0.00",
  wrap: "0.00",
  rotation_threshold: "0.40",
  static_penalty_rate: "0.80",
};

export function formatTariffAmount(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

export function formatPercentRate(value, fallback = 0) {
  const num = parseFloat(value ?? fallback);
  if (Number.isNaN(num)) return "0%";
  return `${(num * 100).toFixed(0)}%`;
}

export const CONDITION_SECTIONS = [
  {
    key: "frozen",
    label: "Congelado",
    accent: "text-sky-700 dark:text-sky-400",
    ring: "ring-sky-200/80 dark:ring-sky-500/20",
    bg: "bg-sky-50/50 dark:bg-sky-500/10",
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
    bg: "bg-violet-50/50 dark:bg-violet-500/10",
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
    bg: "bg-amber-50/50 dark:bg-amber-500/10",
    inPallet: "in_pallet_dry",
    inFloor: "in_floor_dry",
    out: "out_dry",
    storage: "dry_storage",
  },
];
