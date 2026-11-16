"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Filter,
  FilterX,
  History,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";
import { useWmsSearchParams } from "@/hooks/useWmsRouter";
import { useViewHistory } from "@/hooks/useViewHistory";
import SectionHistoryModal, {
  TASK_ACTION_OPTIONS,
} from "@/components/activity/SectionHistoryModal";
import ViewHistoryButton from "@/components/activity/ViewHistoryButton";

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
import {
  generateTaskLines,
  getTask,
  getTasks,
  patchTask,
} from "@/services/taskService";
import { canCRUD, getApiErrorMessage } from "@/services/httpClient";
import { formatDocumentCode } from "@/lib/format";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import TaskLinesPanel from "./components/TaskLinesPanel";
import TaskStatusMenu from "./components/TaskStatusMenu";
import {
  EMPTY_TASK,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_OPTIONS,
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

/** Cliente arriba; cava / pasillo / producto abajo en una línea. */
function scopeDisplay(task) {
  const client = task.client?.name || "";
  const detail = [
    ...(task.cavas || []).map((c) => c.name || c.code).filter(Boolean),
    ...(Array.isArray(task.halls) ? task.halls : [])
      .map((h) => String(h || "").trim())
      .filter(Boolean),
    ...(task.products || [])
      .map((p) => p.name || p.client_sku)
      .filter(Boolean),
  ].join(" · ");
  return { client, detail };
}

export default function TasksView() {
  const user = useAuth().user;
  const perms = canCRUD(user, "task", "task");
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const {
    historyOpen,
    historyType,
    historyActor,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [modalInitialTab, setModalInitialTab] = useState("details");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

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

  const handleShowModal = (task, mode, initialTab = "details") => {
    setSelectedTask(task);
    setModalMode(mode);
    setModalInitialTab(initialTab);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
    setModalInitialTab("details");
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
      if (status === "completada" || status === "verificacion") {
        if (status === "completada") {
          patch.completed_at = new Date().toISOString();
        }
        // Backend redirige a verificacion si require_approval.
      }
      const updated = await patchTask(task.id, patch);
      if (status === "en_proceso") {
        const gen = await generateTaskLines(task.id);
        if (!gen?.lines_count) {
          showAlertMessage(
            "warning",
            "Tarea iniciada sin bins almacenados en el alcance.",
          );
          await loadTasks();
          return;
        }
      }
      await loadTasks();
      showAlertMessage(
        "success",
        updated?.status === "completada"
          ? "Tarea completada"
          : "Estado actualizado",
      );
    } catch (err) {
      showAlertMessage(
        "danger",
        getApiErrorMessage(err, "No se pudo actualizar el estado."),
      );
    }
  };

  const canAdvanceTask = (task) => {
    const total = Number(task.lines_count || 0);
    const done = Number(task.lines_done || 0);
    return total > 0 && done >= total;
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
                className="w-full min-w-0 max-w-full sm:!w-[300px] sm:!min-w-[220px] sm:!max-w-full shrink-0"
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
                <ViewHistoryButton onClick={openHistory} />
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
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell>Tarea</Table.HeaderCell>
                    <Table.HeaderCell>Tipo</Table.HeaderCell>
                    <Table.HeaderCell>Prioridad</Table.HeaderCell>
                    <Table.HeaderCell>Alcance</Table.HeaderCell>
                    <Table.HeaderCell>Recorrido</Table.HeaderCell>
                    <Table.HeaderCell>Asignados</Table.HeaderCell>
                    <Table.HeaderCell>Estado</Table.HeaderCell>
                    <Table.HeaderCell className="text-end">Acciones</Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {tasks.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    const advanceReady = canAdvanceTask(task);
                    const alcance = scopeDisplay(task);
                    return (
                      <Fragment key={task.id}>
                        <Table.Row>
                          <Table.Cell>
                            <button
                              type="button"
                              className="inline-flex cursor-pointer items-center gap-1.5 text-left"
                              onClick={() =>
                                setExpandedTaskId((prev) =>
                                  prev === task.id ? null : task.id,
                                )
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-sky-700" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sky-700" />
                              )}
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-sky-700 hover:underline">
                                  {formatDocumentCode(task.code)}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  {task.title || "Sin título"}
                                </span>
                              </span>
                            </button>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="secondary" dot={false}>
                              {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              variant={
                                TASK_PRIORITY_VARIANTS[task.priority] ||
                                "secondary"
                              }
                              dot={false}
                            >
                              {TASK_PRIORITY_LABELS[task.priority] ||
                                task.priority}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {!alcance.client && !alcance.detail ? (
                              <span className="text-xs text-slate-400">
                                Todo el alcance
                              </span>
                            ) : (
                              <div className="min-w-[10rem] max-w-[16rem]">
                                {alcance.client ? (
                                  <div
                                    className="truncate text-sm font-medium text-slate-800"
                                    title={alcance.client}
                                  >
                                    {alcance.client}
                                  </div>
                                ) : null}
                                {alcance.detail ? (
                                  <div
                                    className="truncate text-xs text-slate-500"
                                    title={alcance.detail}
                                  >
                                    {alcance.detail}
                                  </div>
                                ) : null}
                              </div>
                            )}
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
                            <TaskStatusMenu
                              task={task}
                              canChange={Boolean(perms.change)}
                              advanceReady={advanceReady}
                              onChange={(status) =>
                                handleQuickStatus(task, status)
                              }
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center justify-end gap-0.5">
                              {task.status === "completada" &&
                              task.pdf_document ? (
                                <a
                                  href={task.pdf_document}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ver informe"
                                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50"
                                >
                                  <FileText className="h-4 w-4" />
                                </a>
                              ) : null}
                              {perms.view ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-600"
                                  title="Ver historial"
                                  onClick={() =>
                                    handleShowModal(task, "view", "history")
                                  }
                                >
                                  <History className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                              {perms.view ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  title="Ver"
                                  onClick={() =>
                                    handleShowModal(task, "view")
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </IconButton>
                              ) : null}
                              {perms.change ? (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  title="Editar"
                                  onClick={() =>
                                    handleShowModal(task, "edit")
                                  }
                                >
                                  <Pencil className="h-4 w-4" />
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
                            <Table.Cell
                              colSpan={8}
                              className="!bg-slate-50/80 p-0"
                            >
                              <div className="border-t border-[var(--border-subtle)] px-4 py-3">
                                <TaskLinesPanel
                                  taskId={task.id}
                                  taskStatus={task.status}
                                  canEdit={Boolean(
                                    perms.change &&
                                      ["en_proceso", "asignada", "verificacion"].includes(
                                        task.status,
                                      ),
                                  )}
                                  onChanged={() => {
                                    void loadTasks();
                                  }}
                                />
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
        initialTab={modalInitialTab}
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

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="task"
        title="Historial de movimientos de tareas"
        actionOptions={TASK_ACTION_OPTIONS}
        initialAction={historyType}
        initialActor={historyActor}
        initialBatchId={historyBatch}
        onOpenItem={async (item) => {
          if (!item?.resource_id) return;
          try {
            const task = await getTask(item.resource_id);
            handleShowModal(task, "view", "history");
          } catch {
            showAlertMessage("danger", "No se pudo abrir la tarea.");
          }
        }}
      />
    </Fragment>
  );
}
