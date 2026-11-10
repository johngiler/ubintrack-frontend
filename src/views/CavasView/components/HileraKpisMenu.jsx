"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion } from "motion/react";

import { Form } from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/services/httpClient";
import { setHileraPush } from "@/services/storageService";
import { revalidatePositions } from "@/lib/swr";
import { emptyOccupancyKpis } from "../cavaPlan";

const MENU_WIDTH = 220;

const ROWS = [
  { key: "total", label: "Total", dot: "bg-sky-600", text: "text-sky-800" },
  { key: "activa", label: "Activas", dot: "bg-slate-700", text: "text-slate-700" },
  { key: "libre", label: "Libre", dot: "bg-emerald-500", text: "text-emerald-700" },
  { key: "asignado", label: "Asignado", dot: "bg-orange-500", text: "text-orange-700" },
  { key: "ocupado", label: "Ocupado", dot: "bg-red-500", text: "text-red-700" },
  { key: "inactivo", label: "Inactivo", dot: "bg-slate-400", text: "text-slate-500" },
  { key: "picking", label: "Picking", dot: "bg-sky-500", text: "text-sky-700" },
  { key: "push", label: "Push", dot: "bg-amber-500", text: "text-amber-700" },
];

function menuPosition(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const margin = 8;
  const gap = 6;
  let left = rect.left;
  if (left + MENU_WIDTH > window.innerWidth - margin) {
    left = window.innerWidth - margin - MENU_WIDTH;
  }
  left = Math.max(margin, left);
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 200 && rect.top > spaceBelow;
  return openUp
    ? { left, bottom: window.innerHeight - rect.top + gap, top: "auto" }
    : { left, top: rect.bottom + gap, bottom: "auto" };
}

export default function HileraKpisMenu({
  title,
  kpis,
  anchorEl,
  onClose,
  cavaId = null,
  hall = "",
  racks = null,
  showPush = false,
  isPush = false,
  readOnly = false,
  onChanged,
}) {
  const data = kpis || emptyOccupancyKpis();
  const [coords, setCoords] = useState(null);
  const [pushOn, setPushOn] = useState(Boolean(isPush));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef(null);
  const canTogglePush =
    showPush && !readOnly && Boolean(cavaId) && Array.isArray(racks) && racks.length > 0;

  useLayoutEffect(() => {
    if (!anchorEl) return undefined;
    const placeMenu = () => {
      if (!anchorEl.isConnected) {
        onClose();
        return;
      }
      setCoords(menuPosition(anchorEl));
    };
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [anchorEl, onClose]);

  useEffect(() => {
    setPushOn(Boolean(isPush));
    setError("");
  }, [isPush, title]);

  useEffect(() => {
    function onPointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      if (anchorEl?.contains(event.target)) return;
      onClose();
    }
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorEl, onClose]);

  async function togglePush() {
    if (!canTogglePush || busy) return;
    const next = !pushOn;
    setBusy(true);
    setError("");
    try {
      await setHileraPush(cavaId, { hall, racks, is_push: next });
      setPushOn(next);
      await revalidatePositions();
      onChanged?.();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar push."));
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined" || !coords) return null;

  return createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
      style={{ position: "fixed", width: MENU_WIDTH, zIndex: 70, ...coords }}
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="truncate text-xs font-semibold text-slate-700">{title}</p>
        <IconButton size="sm" aria-label="Cerrar" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {error ? <p className="px-3 pt-2 text-xs text-red-600">{error}</p> : null}
      {showPush ? (
        <div className="border-b border-slate-100 px-3 py-2">
          {readOnly ? (
            pushOn ? (
              <span className="text-xs font-medium text-sky-700">Push</span>
            ) : (
              <span className="text-xs text-slate-400">Sin push</span>
            )
          ) : (
            <Form.Check
              type="switch"
              id={`hilera-push-${title}`}
              className="!min-h-0 gap-1.5"
              label="Push"
              checked={pushOn}
              disabled={!canTogglePush || busy}
              onChange={togglePush}
            />
          )}
        </div>
      ) : null}
      <ul className="py-1">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className={`inline-flex items-center gap-1.5 text-xs ${row.text}`}>
              <span className={`h-1.5 w-1.5 shrink-0 ${row.dot}`} />
              {row.label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-slate-800">
              {Number(data[row.key]) || 0}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>,
    document.body,
  );
}
