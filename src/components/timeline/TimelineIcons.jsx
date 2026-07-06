import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  Building2,
  Calendar,
  CheckCheck,
  CheckCircle,
  CirclePlus,
  ExternalLink,
  Inbox,
  Info,
  MapPin,
  Minus,
  PackagePlus,
  RefreshCw,
  Scale,
  Shuffle,
  Trash2,
  Truck,
  Undo2,
  Upload,
  User,
} from "lucide-react";

import { cn } from "@/lib/cn";

export const timelineIconClass = "h-4 w-4 shrink-0";
export const inlineIconClass = "inline h-3.5 w-3.5 shrink-0";

export function BinMovementIcon({ movementType, newStatus }) {
  if (movementType === "created") {
    return <CirclePlus className={cn(timelineIconClass, "text-emerald-600 dark:text-emerald-400")} />;
  }
  if (movementType === "exit_processed") {
    return <Minus className={cn(timelineIconClass, "text-amber-600 dark:text-amber-400")} />;
  }
  if (movementType === "exit_reversed") {
    return <Undo2 className={cn(timelineIconClass, "text-sky-600 dark:text-sky-400")} />;
  }
  if (movementType === "status_changed") {
    if (newStatus === "almacenado") {
      return <Archive className={cn(timelineIconClass, "text-blue-600 dark:text-blue-400")} />;
    }
    if (newStatus === "en_despacho") {
      return <Truck className={cn(timelineIconClass, "text-sky-600 dark:text-sky-400")} />;
    }
    if (newStatus === "despachado") {
      return <CheckCircle className={cn(timelineIconClass, "text-slate-600 dark:text-slate-400")} />;
    }
  }
  return <Info className={cn(timelineIconClass, "text-slate-500 dark:text-slate-400")} />;
}

export function ExitMovementIcon({ movementType }) {
  const map = {
    created: [CirclePlus, "text-emerald-600 dark:text-emerald-400"],
    import_created: [Upload, "text-emerald-600 dark:text-emerald-400"],
    status_changed: [RefreshCw, "text-blue-600 dark:text-blue-400"],
    product_added: [PackagePlus, "text-sky-600 dark:text-sky-400"],
    product_removed: [Trash2, "text-red-600 dark:text-red-400"],
    bin_assigned: [Archive, "text-sky-600 dark:text-sky-400"],
    bin_removed: [Archive, "text-red-600 dark:text-red-400"],
    bin_processed: [CheckCircle, "text-amber-600 dark:text-amber-400"],
    bin_reversed: [Undo2, "text-sky-600 dark:text-sky-400"],
    bin_replaced: [ArrowLeftRight, "text-blue-600 dark:text-blue-400"],
    bin_reassigned: [Shuffle, "text-blue-600 dark:text-blue-400"],
    quantity_changed: [Scale, "text-amber-600 dark:text-amber-400"],
    conflict_detected: [AlertTriangle, "text-red-600 dark:text-red-400"],
    conflict_resolved: [CheckCheck, "text-emerald-600 dark:text-emerald-400"],
  };

  const [Icon, colorClass] = map[movementType] ?? [Info, "text-slate-500 dark:text-slate-400"];
  return <Icon className={cn(timelineIconClass, colorClass)} />;
}

export {
  ArrowLeftRight as TimelineArrowRight,
  Building2 as TimelineBuilding,
  Calendar as TimelineCalendar,
  CheckCircle as TimelineCheckCircle,
  ExternalLink as TimelineExternalLink,
  Inbox as TimelineInbox,
  MapPin as TimelineMapPin,
  Undo2 as TimelineUndo,
  User as TimelineUser,
};
