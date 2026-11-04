"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FilterX, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";

import {
  Alert,
  Button,
  Card,
  Pagination,
  Table,
} from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import { formatDateTime } from "@/lib/format";
import {
  createTaskTracking,
  getTaskTrackings,
  updateTaskTracking,
} from "@/services/taskService";
import { canCRUD } from "@/services/httpClient";
import { TASK_STATUS_LABELS, TASK_STATUS_VARIANTS } from "@/views/TasksView/taskLabels";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";

const PAGE_SIZE = 20;

const EMPTY_TRACKING = {
  is_active: true,
  timer_start: null,
  timer_stop: null,
  task: null,
  user: null,
};

export default function TrackingsView() {
  const user = useAuth().user;
  const perms = canCRUD(user, "task", "usertasktracking");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: trackings,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadTrackings,
  } = usePaginatedList({
    key: swrKeys.trackings(currentPage),
    fetcher: () => getTaskTrackings(currentPage, {}, PAGE_SIZE),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar los seguimientos");
  }, [error, showAlertMessage]);

  const filteredTrackings = useMemo(() => {
    if (!debouncedSearchTerm) return trackings;
    const term = debouncedSearchTerm.toLowerCase();
    return trackings.filter(
      (tracking) =>
        tracking.task?.code?.toLowerCase().includes(term) ||
        tracking.user?.full_name?.toLowerCase().includes(term),
    );
  }, [trackings, debouncedSearchTerm]);

  const handleShowModal = (tracking, mode) => {
    setSelectedTracking(tracking);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTracking(null);
  };

  const handleSaveTracking = async (payload) => {
    if (selectedTracking?.id) {
      await updateTaskTracking(selectedTracking.id, payload);
      showAlertMessage("success", "Seguimiento actualizado correctamente");
    } else {
      await createTaskTracking(payload);
      showAlertMessage("success", "Seguimiento creado correctamente");
    }
    await loadTrackings();
  };

  const formatDuration = (duration) => {
    if (!duration) return "—";
    if (typeof duration === "string") return duration;
    return String(duration);
  };

  return (
    <Fragment>
      {alert.show ? (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      ) : null}

      <WmsPageHeader
        title="Seguimiento de tareas"
        description="Registra tiempos de trabajo por tarea y usuario."
        icon={Timer}
        breadcrumbs={[
          { title: "Tareas", active: true },
          { title: "Seguimiento", active: true },
        ]}
      />

      <Card>
        <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
          <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto">
            <WmsSearchBar
              id="search-tracking"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              placeholder="Buscar por tarea o usuario"
              className="min-w-[220px] flex-1"
            />
            {debouncedSearchTerm ? (
              <Button variant="outline" size="sm" icon={FilterX} onClick={() => setSearchTerm("")}>
                Limpiar
              </Button>
            ) : null}
            {perms.add ? (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                className="ml-auto shrink-0"
                onClick={() => handleShowModal({ ...EMPTY_TRACKING, timer_start: new Date().toISOString() }, "edit")}
              >
                Nuevo seguimiento
              </Button>
            ) : null}
          </div>
        </Card.Header>

        <Card.Body className="!p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            </div>
          ) : filteredTrackings.length ? (
            <div className="overflow-x-auto">
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Usuario</th>
                    <th>Estado tarea</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Duración</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrackings.map((tracking) => (
                    <tr key={tracking.id}>
                      <td className="font-medium text-slate-800">{tracking.task?.code || "—"}</td>
                      <td>{tracking.user?.full_name || "—"}</td>
                      <td>
                        <Badge
                          variant={TASK_STATUS_VARIANTS[tracking.task?.status] || "secondary"}
                          dot={false}
                        >
                          {TASK_STATUS_LABELS[tracking.task?.status] || tracking.task?.status || "—"}
                        </Badge>
                      </td>
                      <td>{tracking.timer_start ? formatDateTime(tracking.timer_start) : "—"}</td>
                      <td>{tracking.timer_stop ? formatDateTime(tracking.timer_stop) : "—"}</td>
                      <td>{formatDuration(tracking.duration)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <IconButton
                            size="sm"
                            title="Ver"
                            className="text-sky-600 hover:bg-sky-50"
                            onClick={() => handleShowModal(tracking, "view")}
                          >
                            <Eye className="h-4 w-4" />
                          </IconButton>
                          {perms.change ? (
                            <IconButton
                              size="sm"
                              title="Editar"
                              className="text-slate-600 hover:bg-slate-100"
                              onClick={() => handleShowModal(tracking, "edit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </IconButton>
                          ) : null}
                          {perms.delete ? (
                            <IconButton
                              size="sm"
                              title="Eliminar"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedTracking(tracking);
                                setShowConfirmModal(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <WmsListEmptyState
              icon={Timer}
              emptyTitle="No hay seguimientos registrados"
              emptyDescription="Registra el primer seguimiento de tiempo."
              filtersTitle="No se encontraron seguimientos"
              filtersDescription="Ajusta la búsqueda."
              hasFilters={Boolean(debouncedSearchTerm)}
              canCreate={perms.add}
              onClearFilters={() => setSearchTerm("")}
              onCreate={() =>
                handleShowModal({ ...EMPTY_TRACKING, timer_start: new Date().toISOString() }, "edit")
              }
              createLabel="Nuevo seguimiento"
            />
          )}
        </Card.Body>

        {totalPages > 1 ? (
          <Card.Footer className="flex flex-wrap items-center justify-between gap-3">
            <p className="mb-0 text-sm text-slate-600">
              Mostrando del <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong> al{" "}
              <strong>{Math.min(currentPage * PAGE_SIZE, totalItems)}</strong> de{" "}
              <strong>{totalItems}</strong>
            </p>
            <Pagination className="mb-0">
              <Pagination.Prev
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              />
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <Pagination.Item
                    key={pageNum}
                    active={currentPage === pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              />
            </Pagination>
          </Card.Footer>
        ) : null}
      </Card>

      <ModalEdit
        show={showModal}
        onHide={handleCloseModal}
        tracking={selectedTracking}
        mode={modalMode}
        onSave={handleSaveTracking}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        tracking={selectedTracking}
        onDelete={loadTrackings}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
