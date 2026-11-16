"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
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
  Table,
} from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import TasksViewSkeleton from "./TasksViewSkeleton";
import { formatDateTime } from "@/lib/format";
import { getTasks, patchTask } from "@/services/taskService";
import { canCRUD, getApiErrorMessage } from "@/services/httpClient";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import TaskLogsPanel from "./components/TaskLogsPanel";
import {
  EMPTY_TASK,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_VARIANTS,
  TASK_TYPE_LABELS,
  TASK_TYPE_OPTIONS,
} from "./taskLabels";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  task_type: "",
  status: "",
  priority: "",
};

function coverageLabel(task) {
  const total = Number(task.lines_count || 0);
  const done = Number(task.lines_done || 0);
  if (!total) return "Sin recorrido";
  return `${done}/${total}`;
}

function scopeSummary(task) {
  const parts = [];
  if (task.client?.name) parts.push(task.client.name);

  const cavaNames = (task.cavas || [])
    .map((c) => c.name || c.code)
    .filter(Boolean);
  if (cavaNames.length) parts.push(cavaNames.join(", "));

  const halls = Array.isArray(task.halls) ? task.halls.filter(Boolean) : [];
  if (halls.length) parts.push(halls.join(", "));

  const productNames = (task.products || [])
    .map((p) => p.name || p.client_sku)
    .filter(Boolean);
  if (productNames.length) parts.push(productNames.join(", "));

  return parts.length ? parts.join(" · ") : "Todo el alcance";
}

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
    fetcher: () =>
      getTasks(currentPage, filters, debouncedSearchTerm, PAGE_SIZE),
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar las tareas");
  }, [error, showAlertMessage]);

  const activeFilterCount = [
    filters.task_type,
    filters.status,
    filters.priority,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
  };

  const handleShowModal = (task, mode) => {
    setSelectedTask(task);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  const handleAfterSave = async () => {
    await loadTasks();
    showAlertMessage("success", "Tarea guardada");
  };

  const handleQuickStatus = async (task, status) => {
    try {
      const patch = { status };
      if (status === "en_proceso" && !task.started_at) {
        patch.started_at = new Date().toISOString();
      }
      if (status === "completada") {
        patch.completed_at = new Date().toISOString();
      }
      await patchTask(task.id, patch);
      await loadTasks();
    } catch (err) {
      showAlertMessage(
        "danger",
        getApiErrorMessage(err, "No se pudo actualizar el estado."),
      );
    }
  };

  return (
    <Fragment>
      {alert.show ? (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      ) : null}

      <WmsPageHeader
        title="Tareas"
        description="Órdenes de trabajo de inventario en bodega."
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
                placeholder="Buscar por código, título u observaciones"
                className="!w-[300px] !min-w-[220px] !max-w-full shrink-0"
              />
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                {activeFilterCount > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FilterX}
                    onClick={clearFilters}
                    title="Limpiar filtros"
                  >
                    Limpiar
                  </Button>
                ) : null}
                <Button
                  variant={
                    filtersOpen || activeFilterCount > 0 ? "secondary" : "outline"
                  }
                  size="sm"
                  icon={Filter}
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                >
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
                {perms.add ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
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
                  <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-3">
                    <Form.Group className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">
                        Tipo
                      </Form.Label>
                      <Select
                        size="sm"
                        isClearable
                        options={TASK_TYPE_OPTIONS}
                        value={filters.task_type || null}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            task_type: e?.target?.value || "",
                          }))
                        }
                        placeholder="Todos"
                      />
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">
                        Estado
                      </Form.Label>
                      <Select
                        size="sm"
                        isClearable
                        options={TASK_STATUS_OPTIONS}
                        value={filters.status || null}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            status: e?.target?.value || "",
                          }))
                        }
                        placeholder="Todos"
                      />
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">
                        Prioridad
                      </Form.Label>
                      <Select
                        size="sm"
                        isClearable
                        options={TASK_PRIORITY_OPTIONS}
                        value={filters.priority || null}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priority: e?.target?.value || "",
                          }))
                        }
                        placeholder="Todas"
                      />
                    </Form.Group>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {isLoading ? (
            <TasksViewSkeleton />
          ) : tasks.length === 0 ? (
            <WmsListEmptyState
              hasFilters={Boolean(debouncedSearchTerm || activeFilterCount)}
              canCreate={Boolean(perms.add)}
              emptyTitle="No hay tareas"
              emptyDescription="Cree una orden de inventario para empezar."
              createLabel="Nueva tarea"
              onClearFilters={clearFilters}
              onCreate={() => handleShowModal({ ...EMPTY_TASK }, "edit")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table hover className="mb-0 min-w-[1100px]">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Tarea</Table.HeaderCell>
                    <Table.HeaderCell>Tipo</Table.HeaderCell>
                    <Table.HeaderCell>Estado</Table.HeaderCell>
                    <Table.HeaderCell>Prioridad</Table.HeaderCell>
                    <Table.HeaderCell>Alcance</Table.HeaderCell>
                    <Table.HeaderCell>Recorrido</Table.HeaderCell>
                    <Table.HeaderCell>Asignados</Table.HeaderCell>
                    <Table.HeaderCell className="text-end">Acciones</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tasks.map((task) => {
                    const isExpanded = Boolean(expandedLogs[task.id]);
                    return (
                      <Fragment key={task.id}>
                        <Table.Row>
                          <Table.Cell>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-left text-sm font-semibold text-sky-700 hover:underline"
                                onClick={() =>
                                  setExpandedLogs((prev) => ({
                                    ...prev,
                                    [task.id]: !prev[task.id],
                                  }))
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                {task.code}
                              </button>
                              <span className="text-xs text-slate-500">
                                {task.title || "Sin título"}
                              </span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="secondary" dot={false}>
                              {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              variant={TASK_STATUS_VARIANTS[task.status] || "secondary"}
                              dot={false}
                            >
                              {TASK_STATUS_LABELS[task.status] || task.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              variant={
                                TASK_PRIORITY_VARIANTS[task.priority] || "secondary"
                              }
                              dot={false}
                            >
                              {TASK_PRIORITY_LABELS[task.priority] || task.priority}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm text-slate-600">
                              {scopeSummary(task)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm tabular-nums text-slate-700">
                              {coverageLabel(task)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm text-slate-600">
                              {(task.assigned_to || [])
                                .map((u) => u.full_name || u.username)
                                .join(", ") || "—"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex justify-end gap-1">
                              {perms.view ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  title="Ver"
                                  onClick={() => handleShowModal(task, "view")}
                                >
                                  <Eye className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                              {perms.change ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  title="Editar"
                                  onClick={() => handleShowModal(task, "edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                              {perms.change &&
                              ["pendiente", "asignada"].includes(task.status) ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  className="text-sky-600"
                                  title="Iniciar"
                                  onClick={() =>
                                    handleQuickStatus(task, "en_proceso")
                                  }
                                >
                                  <Play className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                              {perms.change &&
                              ["en_proceso", "verificacion"].includes(
                                task.status,
                              ) ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600"
                                  title="Completar"
                                  onClick={() =>
                                    handleQuickStatus(task, "completada")
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                              {perms.delete ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-600"
                                  title="Eliminar"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setShowConfirmModal(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                        {isExpanded ? (
                          <Table.Row>
                            <Table.Cell colSpan={8} className="!bg-slate-50/80 p-0">
                              <div className="border-t border-[var(--border-subtle)] px-4 py-3">
                                <p className="mb-2 text-xs text-slate-500">
                                  Creada {formatDateTime(task.created_at)}
                                  {task.started_at
                                    ? ` · Inicio ${formatDateTime(task.started_at)}`
                                    : ""}
                                </p>
                                <TaskLogsPanel taskId={task.id} />
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
        </Card.Body>

        {totalPages > 1 ? (
          <Card.Footer className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3">
            <span className="text-sm text-slate-500">
              {totalItems} tarea{totalItems === 1 ? "" : "s"}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </Card.Footer>
        ) : null}
      </Card>

      <ModalEdit
        show={showModal}
        onHide={handleCloseModal}
        task={selectedTask}
        mode={modalMode}
        onSave={handleAfterSave}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => {
          setShowConfirmModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onDelete={async () => {
          await loadTasks();
          showAlertMessage("success", "Tarea eliminada");
        }}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
