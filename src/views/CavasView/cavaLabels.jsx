import { Badge } from "@/components/ui/Badge";
import { conditionLabels } from "@/lib/productLabels";

const conditionBadgeClass = {
  Congelado: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
  Refrigerado: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80",
  Seco: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80",
};

export function ConditionBadge({ condition }) {
  const label = conditionLabels[condition] || condition || "—";
  const className = conditionBadgeClass[condition] || "";

  return (
    <Badge variant="default" dot={false} className={className}>
      {label}
    </Badge>
  );
}

export { conditionLabels };
