"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Trash2, X } from "lucide-react";
import { motion } from "motion/react";

import { Button, Form, Modal } from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { getApiErrorMessage } from "@/services/httpClient";
import { deletePosition, getCellPositions, patchPosition } from "@/services/storageService";
import { revalidateBins, revalidatePositions } from "@/lib/swr";

const MENU_WIDTH = 520;

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
  const placesKey = Array.isArray(places) ? places.join(",") : "";

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
        {!cavaId ? (
          <p className="px-3 py-3 text-xs text-slate-500">Guarde la cava para gestionar las posiciones.</p>
        ) : loading ? (
          <div className="flex flex-col gap-2 px-3 py-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : positions.length ? (
          <ul className="max-h-64 overflow-y-auto py-1">
            {positions.map((position) => {
              const mark = statusMark(position);
              return (
              <li key={position.id} className="flex items-center gap-2 px-3 py-1">
                <span className={`min-w-0 flex-1 truncate text-xs ${position.is_active ? "text-slate-700" : "text-slate-400"}`}>
                  {position.code}
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] ${mark.text}`}>
                  <span className={`h-1.5 w-1.5 ${mark.dot}`} />
                  {mark.label}
                </span>
                {readOnly ? (
                  position.is_picking ? (
                    <span className="shrink-0 text-[11px] font-medium text-sky-700">Picking</span>
                  ) : null
                ) : (
                  <>
                    <Form.Check
                      type="switch"
                      id={`cell-position-picking-${position.id}`}
                      className="!min-h-0 shrink-0 gap-1.5"
                      label="Picking"
                      checked={Boolean(position.is_picking)}
                      disabled={busyId === position.id}
                      onChange={() => togglePicking(position)}
                    />
                    <Form.Check
                      type="switch"
                      id={`cell-position-active-${position.id}`}
                      className="!min-h-0 shrink-0 gap-1.5"
                      label={position.is_active ? "Activo" : "Inactivo"}
                      checked={Boolean(position.is_active)}
                      disabled={busyId === position.id}
                      onChange={() => toggleActive(position)}
                    />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label="Eliminar"
                      disabled={busyId === position.id}
                      onClick={() => setPendingDelete(position)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
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
