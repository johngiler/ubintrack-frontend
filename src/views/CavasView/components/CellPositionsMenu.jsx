"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Trash2, X } from "lucide-react";
import { motion } from "motion/react";

import { Button, Modal } from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import { getApiErrorMessage } from "@/services/httpClient";
import { deletePosition, getCellPositions, patchPosition } from "@/services/storageService";
import { revalidateBins, revalidatePositions } from "@/lib/swr";

const MENU_WIDTH_EDIT = 400;
const MENU_WIDTH_VIEW = 340;

const STATUS_LABEL = {
  libre: "Libre",
  asignado: "Asignado",
  ocupado: "Ocupado",
};

function statusMark(position) {
  if (!position.is_active) return { label: STATUS_LABEL[position.status] || "Libre", dot: "bg-slate-400", text: "text-slate-400" };
  if (position.status === "ocupado") return { label: "Ocupado", dot: "bg-red-500", text: "text-red-600" };
  if (position.status === "asignado") return { label: "Asignado", dot: "bg-orange-500", text: "text-orange-600" };
  return { label: "Libre", dot: "bg-emerald-500", text: "text-emerald-600" };
}

function FlagCell({ on, onClass, label }) {
  return (
    <span
      className={`inline-flex w-full justify-center text-[10px] font-semibold tabular-nums ${
        on ? onClass : "text-slate-300"
      }`}
      title={label}
    >
      {on ? "Sí" : "—"}
    </span>
  );
}

/** Switch compacto solo para esta lista (no el Form.Check global). */
function MiniSwitch({ id, checked, disabled, onChange, "aria-label": ariaLabel }) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="relative inline-flex h-3.5 w-7 shrink-0 items-center">
        <input
          type="checkbox"
          id={id}
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={onChange}
          aria-label={ariaLabel}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-[var(--brand-primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)]" />
        <span className="absolute left-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-3.5" />
      </span>
    </label>
  );
}

function menuPosition(anchorEl, menuWidth) {
  const rect = anchorEl.getBoundingClientRect();
  const margin = 8;
  const gap = 6;
  let left = rect.left;
  if (left + menuWidth > window.innerWidth - margin) {
    left = window.innerWidth - margin - menuWidth;
  }
  left = Math.max(margin, left);
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 220 && rect.top > spaceBelow;
  return openUp
    ? { left, bottom: window.innerHeight - rect.top + gap, top: "auto" }
    : { left, top: rect.bottom + gap, bottom: "auto" };
}

export default function CellPositionsMenu({
  cavaId,
  hall,
  rack,
  place,
  places = null,
  title,
  readOnly,
  anchorEl,
  onClose,
  onChanged,
}) {
  const [positions, setPositions] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [coords, setCoords] = useState(null);
  const menuRef = useRef(null);
  const navigate = useWmsNavigate();
  const placesKey = Array.isArray(places) ? places.join(",") : "";
  const menuWidth = readOnly ? MENU_WIDTH_VIEW : MENU_WIDTH_EDIT;
  const gridClass = readOnly
    ? "grid grid-cols-[minmax(0,1fr)_4.25rem_1.75rem_1.75rem] items-center gap-x-2"
    : "grid grid-cols-[minmax(0,1fr)_4.25rem_1.75rem_2.25rem_2.25rem_1.5rem] items-center gap-x-3";

  function openInCatalog(position) {
    const code = String(position?.code || "").trim();
    if (!code) return;
    onClose?.();
    navigate(`/storage/positions?search=${encodeURIComponent(code)}`);
  }

  useLayoutEffect(() => {
    if (!anchorEl) return undefined;
    const placeMenu = () => {
      if (!anchorEl.isConnected) {
        onClose();
        return;
      }
      setCoords(menuPosition(anchorEl, menuWidth));
    };
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [anchorEl, onClose, menuWidth]);

  useEffect(() => {
    function onPointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      if (anchorEl?.contains(event.target)) return;
      if (event.target.closest?.("[role='dialog']")) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [anchorEl, onClose]);

  useEffect(() => {
    if (!cavaId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    setPositions([]);
    setCount(0);
    setPage(1);
    getCellPositions({
      cavaId,
      hall,
      rack,
      place: placesKey ? undefined : place,
      places: placesKey ? places : undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setPositions(data.results || []);
        setCount(data.count || 0);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "No se pudieron cargar las posiciones."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cavaId, hall, rack, place, placesKey]);

  async function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    setError("");
    try {
      const data = await getCellPositions({
        cavaId,
        hall,
        rack,
        place: placesKey ? undefined : place,
        places: placesKey ? places : undefined,
        page: next,
      });
      setPositions((rows) => [...rows, ...(data.results || [])]);
      setCount(data.count || 0);
      setPage(next);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las posiciones."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleActive(position) {
    setBusyId(position.id);
    setError("");
    try {
      const updated = await patchPosition(position.id, { is_active: !position.is_active });
      setPositions((rows) =>
        rows.map((row) => (row.id === position.id ? { ...row, is_active: updated.is_active } : row)),
      );
      await revalidatePositions();
      onChanged?.();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar la posición."));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePicking(position) {
    setBusyId(position.id);
    setError("");
    try {
      const updated = await patchPosition(position.id, { is_picking: !position.is_picking });
      setPositions((rows) =>
        rows.map((row) =>
          row.id === position.id ? { ...row, is_picking: updated.is_picking } : row,
        ),
      );
      await revalidatePositions();
      onChanged?.();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar la posición."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deletePosition(pendingDelete.id);
      setPositions((rows) => rows.filter((row) => row.id !== pendingDelete.id));
      setCount((value) => Math.max(0, value - 1));
      setPendingDelete(null);
      await revalidatePositions();
      await revalidateBins();
      onChanged?.();
    } catch (err) {
      if (err?.response?.status === 404) {
        setPositions((rows) => rows.filter((row) => row.id !== pendingDelete.id));
        setCount((value) => Math.max(0, value - 1));
        setPendingDelete(null);
        onChanged?.();
        return;
      }
      setError(getApiErrorMessage(err, "No se pudo eliminar la posición."));
    } finally {
      setDeleting(false);
    }
  }

  if (typeof document === "undefined" || !coords) return null;

  return (
    <>
      {createPortal(
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
        style={{ position: "fixed", width: menuWidth, zIndex: 70, ...coords }}
        className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <p className="truncate text-xs font-semibold text-slate-700">{title}</p>
          <IconButton size="sm" aria-label="Cerrar" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        {error ? <p className="px-3 pt-2 text-xs text-red-600">{error}</p> : null}
        {!cavaId ? (
          <p className="px-3 py-3 text-xs text-slate-500">Guarde la cava para gestionar las posiciones.</p>
        ) : loading ? (
          <div className="flex flex-col gap-2 px-3 py-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : positions.length ? (
          <div className="max-h-64 overflow-y-auto">
            <div
              className={`${gridClass} border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500`}
            >
              <span>Posición</span>
              <span>Estado</span>
              <span className="text-center">Push</span>
              <span className="text-center">Pick</span>
              {readOnly ? null : <span className="text-center">Activo</span>}
              {readOnly ? null : <span />}
            </div>
            <ul className="py-0.5">
              {positions.map((position) => {
                const mark = statusMark(position);
                const busy = busyId === position.id;
                return (
                  <li key={position.id} className={`${gridClass} px-3 py-1.5 hover:bg-slate-50`}>
                    <button
                      type="button"
                      title="Ver en catálogo"
                      onClick={() => openInCatalog(position)}
                      className={`min-w-0 cursor-pointer truncate text-left text-xs font-medium underline-offset-2 hover:underline ${
                        position.is_active ? "text-sky-700" : "text-slate-400"
                      }`}
                    >
                      {position.code}
                    </button>
                    <span className={`inline-flex min-w-0 items-center gap-1 truncate text-[11px] ${mark.text}`}>
                      <span className={`h-1.5 w-1.5 shrink-0 ${mark.dot}`} />
                      {mark.label}
                    </span>
                    <FlagCell on={Boolean(position.is_push)} onClass="text-amber-700" label="Push" />
                    {readOnly ? (
                      <FlagCell
                        on={Boolean(position.is_picking)}
                        onClass="text-sky-700"
                        label="Picking"
                      />
                    ) : (
                      <>
                        <div className="flex justify-center">
                          <MiniSwitch
                            id={`cell-position-picking-${position.id}`}
                            aria-label="Picking"
                            checked={Boolean(position.is_picking)}
                            disabled={busy}
                            onChange={() => togglePicking(position)}
                          />
                        </div>
                        <div className="flex justify-center">
                          <MiniSwitch
                            id={`cell-position-active-${position.id}`}
                            aria-label={position.is_active ? "Activo" : "Inactivo"}
                            checked={Boolean(position.is_active)}
                            disabled={busy}
                            onChange={() => toggleActive(position)}
                          />
                        </div>
                        <div className="flex justify-end">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label="Eliminar"
                            disabled={busy}
                            onClick={() => setPendingDelete(position)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
              {positions.length < count ? (
                <li className="px-3 py-2">
                  <Button variant="outline" size="sm" icon={ChevronDown} loading={loadingMore} onClick={loadMore}>
                    Cargar más
                  </Button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : (
          <p className="px-3 py-3 text-xs text-slate-500">Esta celda no tiene posiciones.</p>
        )}
      </motion.div>,
      document.body,
      )}
      <Modal show={Boolean(pendingDelete)} onHide={() => !deleting && setPendingDelete(null)} size="sm" layerClassName="z-[80]">
        <Modal.Header closeButton>
          <Modal.Title>Eliminar posición</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Eliminar la posición <strong>{pendingDelete?.code}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" icon={X} onClick={() => setPendingDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" icon={Trash2} onClick={confirmDelete} loading={deleting} disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
