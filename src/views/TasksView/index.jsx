"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  FilterX,
  ListTodo,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";

import {
  Alert,
  Button,
  Card,
  Form,
  Pagination,
  Table,
} from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import TasksViewSkeleton from "./TasksViewSkeleton";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  createTask,
  getTasks,
  patchTask,
  updateTask,
} from "@/services/taskService";
import { canCRUD } from "@/services/httpClient";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import TaskLogsPanel from "./components/TaskLogsPanel";
import {
  EMPTY_TASK,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  TASK_TYPE_LABELS,
} from "./taskLabels";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  task_type: "",
  status: "",
  priority: "",
};

export default function TasksView() {
  const user = useAuth().user;
  const perms = canCRUD(user, "task", "task");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.task_type, filters.status, filters.priority]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: tasks,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadTasks,
  } = usePaginatedList({
    key: swrKeys.tasks(currentPage, debouncedSearchTerm, filters),
    fetcher: () => getTasks(currentPage, filters, debouncedSearchTerm),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar las tareas");
  }, [error, showAlertMessage]);

  const handleShowModal = (task, mode) => {
    setSelectedTask(task);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  const handleSaveTask = async (taskData) => {
    if (selectedTask?.id) {
      await updateTask(selectedTask.id, taskData);
      showAlertMessage("success", "Tarea actualizada correctamente");
    } else {
      await createTask(taskData);
      showAlertMessage("success", "Tarea creada correctamente");
    }
    await loadTasks();
  };

  const handleQuickStatusChange = async (task, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === "en_proceso" && !task.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      if (newStatus === "completada" && !task.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      await patchTask(task.id, updateData);
      await loadTasks();
      showAlertMessage("success", "Estado actualizado correctamente");
    } catch {
      showAlertMessage("danger", "Error al actualizar el estado");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const activeFilterCount = [
    filters.task_type,
    filters.status,
    filters.priority,
  ].filter(Boolean).length;

  const hasFilters = Boolean(debouncedSearchTerm) || activeFilterCount > 0;

  const typeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  const statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  const priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <Fragment>
      {alert.show ? (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      ) : null}

      <WmsPageHeader
        title="Tareas"
        description="Gestiona tareas operativas del almacén."
        icon={ListTodo}
        breadcrumbs={[
          { title: "Tareas", active: true },
          { title: "Lista", active: true },
        ]}
      />

      <Card>
        <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-wrap items-center gap-2">
              <WmsSearchBar
                id="search-task"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm("")}
                placeholder="Buscar por código u observaciones"
                className="!w-[280px] !min-w-[220px] !max-w-full shrink-0"
              />
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                {activeFilterCount > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FilterX}
                    onClick={clearFilters}
                    title="Limpiar filtros"
                    className="whitespace-nowrap"
                  >
                    Limpiar
                  </Button>
                ) : null}
                <Button
                  variant={filtersOpen || activeFilterCount > 0 ? "secondary" : "outline"}
                  size="sm"
                  icon={Filter}
                  onClick={() => setFiltersOpen((open) => !open)}
                  title={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
                  className="whitespace-nowrap"
                  aria-expanded={filtersOpen}
                >
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
                {perms.add ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    className="whitespace-nowrap"
                    onClick={() => handleShowModal({ ...EMPTY_TASK }, "edit")}
                  >
                    Nueva tarea
                  </Button>
                ) : null}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {filtersOpen ? (
                <motion.div
                  key="tasks-filters"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  {/* p-1: el anillo de focus de react-select no debe quedar recortado por overflow-hidden */}
                  <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Form.Group className="mb-0">
                      <Form.Label className="text-xs">Tipo</Form.Label>
                      <Select
                        size="sm"
                        isClearable
                        aria-label="Filtrar por tipo"
                        placeholder="Todos"
                        options={typeOptions}
                        value={filters.task_type}
                        onChange={(e) => handleFilterChange("task_type", e.target.value || "")}
                      />
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label className="text-xs">Estado</Form.Label>
                      <Select
                        size="sm"
                        isClearable
                        aria-label="Filtrar por estado"
                        placeholder="Todos"
                        options={statusOptions}
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value || "")}
                      />
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label className="text-xs">Prioridad</Form.Label>
                      <Select
                        size="sm"
                        isClearable
                        aria-label="Filtrar por prioridad"
                        placeholder="Todas"
                        options={priorityOptions}
                        value={filters.priority}
                        onChange={(e) => handleFilterChange("priority", e.target.value || "")}
                      />
                    </Form.Group>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </Card.Header>

        <Card.Body className="!p-0">
          {isLoading ? (
            <TasksViewSkeleton />
          ) : tasks.length ? (
            <div className="overflow-x-auto">
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Asignados</th>
                    <th>Orden</th>
                    <th>Fechas</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <Fragment key={task.id}>
                      <tr>
                        <td>
                          <div className="font-semibold text-slate-800">{task.code}</div>
                          <div className="text-xs text-slate-500">Creado: {formatDate(task.created_at)}</div>
                        </td>
                        <td>
                          <Badge variant="secondary" dot={false}>
                            {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Badge variant={TASK_STATUS_VARIANTS[task.status] || "secondary"} dot={false}>
                              {TASK_STATUS_LABELS[task.status] || task.status}
                            </Badge>
                            {perms.change && task.status === "pendiente" ? (
                              <IconButton
                                size="sm"
                                title="Marcar en proceso"
                                className="text-sky-600 hover:bg-sky-50"
                                onClick={() => handleQuickStatusChange(task, "en_proceso")}
                              >
                                <Play className="h-4 w-4" />
                              </IconButton>
                            ) : null}
                            {perms.change && task.status === "en_proceso" ? (
                              <IconButton
                                size="sm"
                                title="Marcar completada"
                                className="text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleQuickStatusChange(task, "completada")}
                              >
                                <Check className="h-4 w-4" />
                              </IconButton>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <Badge variant={TASK_PRIORITY_VARIANTS[task.priority] || "secondary"} dot={false}>
                            {TASK_PRIORITY_LABELS[task.priority] || task.priority}
                          </Badge>
                        </td>
                        <td>
                          {task.assigned_to?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {task.assigned_to.slice(0, 2).map((assigned) => (
                                <Badge key={assigned.id} variant="secondary" dot={false}>
                                  {assigned.full_name?.split(" ")[0]}
                                </Badge>
                              ))}
                              {task.assigned_to.length > 2 ? (
                                <Badge variant="secondary" dot={false}>
                                  +{task.assigned_to.length - 2}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Sin asignar</span>
                          )}
                        </td>
                        <td>
                          {task.entry?.code ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <ArrowDown className="h-3.5 w-3.5" />
                              {task.entry.code}
                            </span>
                          ) : task.exit?.code ? (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <ArrowUp className="h-3.5 w-3.5" />
                              {task.exit.code}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td>
                          {task.started_at ? (
                            <div className="text-xs text-slate-500">Inicio: {formatDateTime(task.started_at)}</div>
                          ) : null}
                          {task.completed_at ? (
                            <div className="text-xs text-emerald-600">
                              Fin: {formatDateTime(task.completed_at)}
                            </div>
                          ) : null}
                          {!task.started_at && !task.completed_at ? (
                            <span className="text-slate-400">—</span>
                          ) : null}
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <IconButton
                              size="sm"
                              title="Ver"
                              className="text-sky-600 hover:bg-sky-50"
                              onClick={() => handleShowModal(task, "view")}
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            {perms.change ? (
                              <IconButton
                                size="sm"
                                title="Editar"
                                className="text-slate-600 hover:bg-slate-100"
                                onClick={() => handleShowModal(task, "edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            ) : null}
                            {task.task_logs?.length ? (
                              <IconButton
                                size="sm"
                                title="Ver historial"
                                className="text-violet-600 hover:bg-violet-50"
                                onClick={() =>
                                  setExpandedLogs((prev) => ({
                                    ...prev,
                                    [task.id]: !prev[task.id],
                                  }))
                                }
                              >
                                {expandedLogs[task.id] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </IconButton>
                            ) : null}
                            {perms.delete ? (
                              <IconButton
                                size="sm"
                                title="Eliminar"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowConfirmModal(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expandedLogs[task.id] && task.task_logs?.length ? (
                        <tr>
                          <td colSpan={8} className="!p-0">
                            <TaskLogsPanel logs={task.task_logs} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <WmsListEmptyState
              icon={ListTodo}
              emptyTitle="No hay tareas registradas"
              emptyDescription="Comienza creando la primera tarea operativa."
              filtersTitle="No se encontraron tareas"
              filtersDescription="Ajusta la búsqueda o los filtros."
              hasFilters={hasFilters}
              canCreate={perms.add}
              onClearFilters={clearFilters}
              onCreate={() => handleShowModal({ ...EMPTY_TASK }, "edit")}
              createLabel="Nueva tarea"
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
        task={selectedTask}
        mode={modalMode}
        onSave={handleSaveTask}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        task={selectedTask}
        onDelete={loadTasks}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
