"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  FilterX,
  Grid3x3,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";
import { useWmsSearchParams } from "@/hooks/useWmsRouter";

import {
  Card,
  Col,
  Row,
  Button,
  Alert,
  Form,
  Pagination,
  Table,
} from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import PositionsViewSkeleton from "./PositionsViewSkeleton";
import {
  getPositions,
  getPositionHalls,
  getPositionIds,
  getCavas,
  getCava,
  printPosition,
  regeneratePositionTag,
} from "@/services/storageService";
import { canCRUD, getApiErrorMessage } from "@/services/httpClient";
import { aisleDisplayName, isSectionBlock } from "../CavasView/cavaPlan";
import { cavaTitleOf, statusBadgeVariant, statusLabels } from "./positionLabels";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import ModalBulkFlags from "./components/ModalBulkFlags";
import ModalBulkPrint from "./components/ModalBulkPrint";
import ModalBulkRegenerate from "./components/ModalBulkRegenerate";
import PositionExpandedBins from "./components/PositionExpandedBins";

const PAGE_SIZE = 50;

const EMPTY_FILTERS = {
  status: "",
  hall: "",
  cava_id: "",
  is_active: "",
  is_picking: "",
  is_push: "",
};

function boolFilter(value) {
  if (value === "" || value == null) return undefined;
  return value === "true" || value === true;
}

export default function PositionsView() {
  const user = useAuth().user;
  const perms = canCRUD(user, "storage", "position");
  const [searchParams, setSearchParams] = useWmsSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expandedPositions, setExpandedPositions] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [showBulkRegenerateModal, setShowBulkRegenerateModal] = useState(false);
  const [showBulkFlagsModal, setShowBulkFlagsModal] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const initialSearch = searchParams.get("search") || "";
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [searchParams]);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);

  const { data: cavasData } = useSWR(["cavas", "options"], () => getCavas(1, "", 200));
  const cavas = cavasData?.results || [];
  const cavaOptions = cavas.map((cava) => ({
    value: String(cava.id),
    label: `${cavaTitleOf(cava.name, cava.code)}${
      cava.condition ? ` · ${cava.condition}` : ""
    }`,
  }));

  const { data: hallsData } = useSWR(
    ["positions", "halls", filters.cava_id || "all"],
    () => getPositionHalls({ cavaId: filters.cava_id || undefined }),
  );
  const { data: cavaDetail } = useSWR(
    filters.cava_id ? ["cava", filters.cava_id, "hall-labels"] : null,
    () => getCava(filters.cava_id),
  );
  const hallOptions = useMemo(() => {
    const labels = new Map();
    (cavaDetail?.blocks || []).forEach((block) => {
      const code = String(block?.code || "").trim();
      if (!code || !isSectionBlock(block)) return;
      labels.set(code, aisleDisplayName(block));
    });
    return (Array.isArray(hallsData) ? hallsData : []).map((row) => {
      const value = String(row.value ?? row).trim();
      return { value, label: labels.get(value) || value };
    });
  }, [hallsData, cavaDetail]);

  const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const activeOptions = [
    { value: "true", label: "Sí" },
    { value: "false", label: "No" },
  ];

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [
    debouncedSearchTerm,
    filters.status,
    filters.hall,
    filters.cava_id,
    filters.is_active,
    filters.is_picking,
    filters.is_push,
  ]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const apiFilters = {
    ...filters,
    page_size: PAGE_SIZE,
    is_active: boolFilter(filters.is_active),
    is_picking: boolFilter(filters.is_picking),
    is_push: boolFilter(filters.is_push),
  };

  const {
    results: positions,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadPositions,
  } = usePaginatedList({
    key: swrKeys.positions(currentPage, debouncedSearchTerm, apiFilters),
    fetcher: () => getPositions(currentPage, apiFilters, debouncedSearchTerm),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar las posiciones");
  }, [error, showAlertMessage]);

  const visibleIds = useMemo(() => positions.map((row) => row.id), [positions]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectedIds.length;
  const showBulkActions = selectedCount > 0;

  const activeFilterCount = [
    filters.status,
    filters.hall,
    filters.cava_id,
    filters.is_active,
    filters.is_picking,
    filters.is_push,
  ].filter(Boolean).length;

  const hasFilters = Boolean(debouncedSearchTerm) || activeFilterCount > 0;

  const showSelectAllFiltered =
    allVisibleSelected &&
    Boolean(totalItems) &&
    totalItems > visibleIds.length &&
    selectedCount < totalItems;

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
    setSearchParams({});
    setSelectedIds([]);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      // Al cambiar cava, el token de pasillo puede no aplicar.
      if (field === "cava_id") next.hall = "";
      return next;
    });
    setSearchParams({});
  };

  const toggleExpanded = (positionId) => {
    setExpandedPositions((prev) => {
      const next = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      next[positionId] = !prev[positionId];
      return next;
    });
  };

  const toggleSelectOne = (positionId) => {
    setSelectedIds((prev) =>
      prev.includes(positionId)
        ? prev.filter((id) => id !== positionId)
        : [...prev, positionId],
    );
  };

  const toggleSelectAllVisible = () => {
    if (!visibleIds.length) return;
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const handleSelectAllFiltered = async () => {
    setIsSelectingAll(true);
    try {
      const data = await getPositionIds(apiFilters, debouncedSearchTerm);
      setSelectedIds(Array.isArray(data?.ids) ? data.ids : []);
    } catch {
      showAlertMessage("danger", "No se pudieron seleccionar todas");
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleShowModal = (position, mode) => {
    setSelectedPosition(position);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPosition(null);
  };

  const handleNewPosition = () => {
    setSelectedPosition(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const handlePrint = async (position) => {
    try {
      await printPosition(position.id);
      showAlertMessage("success", `Etiqueta enviada a impresión para ${position.code}`);
    } catch {
      showAlertMessage("danger", `Error al imprimir la etiqueta de ${position.code}`);
    }
  };

  const handleRegenerate = async (position) => {
    if (!position?.id || regeneratingId) return;
    setRegeneratingId(position.id);
    try {
      await regeneratePositionTag(position.id);
      showAlertMessage("success", "Etiqueta regenerada.");
      await loadPositions();
    } catch (error) {
      showAlertMessage(
        "danger",
        getApiErrorMessage(error, "No se pudo regenerar la etiqueta."),
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const openBulkDelete = () => {
    setSelectedPosition(null);
    setBulkDeleteIds(selectedIds);
    setShowConfirmModal(true);
  };

  const handleAfterDelete = async () => {
    setSelectedIds([]);
    setBulkDeleteIds(null);
    await loadPositions();
  };

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Posiciones"
        description="Mapa y configuración de posiciones en bodega."
        icon={Grid3x3}
        breadcrumbs={[
          { title: "Bodega", active: true },
          { title: "Posiciones", active: true },
        ]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <WmsSearchBar
                    id="search-position"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchParams({});
                    }}
                    onClear={() => {
                      setSearchTerm("");
                      setSearchParams({});
                    }}
                    placeholder="Buscar por posición, bin o cliente…"
                    className="!w-[280px] !min-w-[220px] !max-w-full shrink-0"
                  />
                  <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                    {activeFilterCount > 0 && (
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
                    )}
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
                    {perms.add && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        className="whitespace-nowrap"
                        onClick={handleNewPosition}
                      >
                        Nueva posición
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {filtersOpen ? (
                    <motion.div
                      key="positions-filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {/* p-1: el anillo de focus de react-select no debe quedar recortado por overflow-hidden */}
                      <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Cava</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por cava"
                            placeholder="Todas"
                            options={cavaOptions}
                            value={filters.cava_id}
                            onChange={(e) =>
                              handleFilterChange("cava_id", e.target.value || "")
                            }
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Pasillo / túnel</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por pasillo o túnel"
                            placeholder="Todos"
                            options={hallOptions}
                            value={filters.hall}
                            onChange={(e) =>
                              handleFilterChange("hall", e.target.value || "")
                            }
                            noOptionsMessage={() =>
                              filters.cava_id ? "Sin secciones" : "Sin tokens"
                            }
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
                            onChange={(e) =>
                              handleFilterChange("status", e.target.value || "")
                            }
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Activo</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por activo"
                            placeholder="Todos"
                            options={activeOptions}
                            value={filters.is_active}
                            onChange={(e) =>
                              handleFilterChange("is_active", e.target.value || "")
                            }
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Picking</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por picking"
                            placeholder="Todos"
                            options={activeOptions}
                            value={filters.is_picking}
                            onChange={(e) =>
                              handleFilterChange("is_picking", e.target.value || "")
                            }
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Push</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por push"
                            placeholder="Todos"
                            options={activeOptions}
                            value={filters.is_push}
                            onChange={(e) =>
                              handleFilterChange("is_push", e.target.value || "")
                            }
                          />
                        </Form.Group>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {showBulkActions ? (
                  <div className="flex w-full flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
                    <span className="text-xs text-slate-600">
                      {selectedCount} seleccionadas
                    </span>
                    {perms.change && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={SlidersHorizontal}
                        onClick={() => setShowBulkFlagsModal(true)}
                        title="Cambiar activo, picking o push"
                        className="shrink-0 whitespace-nowrap"
                      >
                        Cambiar flags
                      </Button>
                    )}
                    {perms.change && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={RefreshCw}
                        onClick={() => setShowBulkRegenerateModal(true)}
                        title="Regenerar QR seleccionados"
                        className="shrink-0 whitespace-nowrap"
                      >
                        Regenerar etiquetas
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Printer}
                      onClick={() => setShowBulkPrintModal(true)}
                      title="Imprimir etiquetas seleccionadas"
                      className="shrink-0 whitespace-nowrap"
                    >
                      Imprimir
                    </Button>
                    {perms.delete && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={openBulkDelete}
                        title="Eliminar posiciones seleccionadas"
                        className="shrink-0 whitespace-nowrap"
                      >
                        Eliminar
                      </Button>
                    )}
                    {showSelectAllFiltered ? (
                      <button
                        type="button"
                        className="cursor-pointer text-xs font-medium text-sky-700 hover:underline disabled:opacity-50"
                        onClick={handleSelectAllFiltered}
                        disabled={isSelectingAll}
                      >
                        {isSelectingAll
                          ? "Seleccionando…"
                          : `Seleccionar todas (${totalItems})`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {isLoading ? (
                <PositionsViewSkeleton />
              ) : positions.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[1000px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="w-10 normal-case tracking-normal">
                        <Form.Check
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          aria-label="Seleccionar página"
                        />
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[160px] normal-case tracking-normal">
                        Código
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                        Cava / Almacén
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Estado
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[90px] normal-case tracking-normal">
                        Picking?
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[90px] normal-case tracking-normal">
                        Push?
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[90px] normal-case tracking-normal">
                        Activo?
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[150px] normal-case tracking-normal">
                        Acciones
                      </Table.HeaderCell>
                    </tr>
                  </Table.Head>
                  <Table.Body>
                    {positions.map((position) => {
                      const isExpanded = Boolean(expandedPositions[position.id]);
                      const isSelected = selectedIds.includes(position.id);
                      const currentBin =
                        position.bins?.find((bin) => bin.status === "almacenado") ||
                        position.bins?.find((bin) => bin.status !== "despachado");
                      const hallToken = String(position.hall || "").trim();

                      return (
                        <Fragment key={position.id}>
                          <Table.Row>
                            <Table.Cell>
                              <Form.Check
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(position.id)}
                                aria-label={`Seleccionar ${position.code}`}
                              />
                            </Table.Cell>
                            <Table.Cell>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-sky-700"
                                onClick={() => toggleExpanded(position.id)}
                              >
                                {position.code}
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </button>
                              {hallToken ? (
                                <div className="mt-0.5 text-[11px] text-slate-400">
                                  {hallToken}
                                  {position.rack ? ` · R${position.rack}` : " · Piso"}
                                </div>
                              ) : null}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">
                                  {cavaTitleOf(position.cava?.name, position.cava?.code)}
                                  {position.cava?.condition
                                    ? ` · ${position.cava.condition}`
                                    : ""}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {position.cava?.storage?.name || "—"}
                                </span>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-col items-start gap-1">
                                <Badge
                                  variant={statusBadgeVariant[position.status] || "default"}
                                  dot={false}
                                >
                                  {statusLabels[position.status] || position.status}
                                </Badge>
                                {["ocupado", "asignado"].includes(position.status) && currentBin && (
                                  <span className="text-xs text-slate-500">{currentBin.code}</span>
                                )}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant={position.is_picking ? "info" : "secondary"} dot={false}>
                                {position.is_picking ? "Sí" : "No"}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant={position.is_push ? "warning" : "secondary"} dot={false}>
                                {position.is_push ? "Sí" : "No"}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant={position.is_active ? "info" : "secondary"} dot={false}>
                                {position.is_active ? "Sí" : "No"}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-1">
                                <IconButton
                                  size="sm"
                                  className="text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => handlePrint(position)}
                                  title="Imprimir etiqueta"
                                >
                                  <Printer className="h-4 w-4" />
                                </IconButton>
                                {perms.change && (
                                  <IconButton
                                    size="sm"
                                    className="text-amber-600 hover:bg-amber-50"
                                    onClick={() => handleRegenerate(position)}
                                    disabled={regeneratingId === position.id}
                                    title="Regenerar etiqueta"
                                  >
                                    {regeneratingId === position.id ? (
                                      <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </IconButton>
                                )}
                                <IconButton
                                  size="sm"
                                  className="text-sky-600 hover:bg-sky-50"
                                  onClick={() => handleShowModal(position, "view")}
                                  title="Ver posición"
                                >
                                  <Eye className="h-4 w-4" />
                                </IconButton>
                                {perms.change && (
                                  <IconButton
                                    size="sm"
                                    className="text-violet-600 hover:bg-violet-50"
                                    onClick={() => handleShowModal(position, "edit")}
                                    title="Editar posición"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </IconButton>
                                )}
                                {perms.delete && (
                                  <IconButton
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setBulkDeleteIds(null);
                                      setSelectedPosition(position);
                                      setShowConfirmModal(true);
                                    }}
                                    title="Eliminar posición"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </IconButton>
                                )}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.tr
                                key={`expanded-${position.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <td colSpan={8} className="p-0">
                                  <PositionExpandedBins bins={position.bins} />
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })}
                  </Table.Body>
                </Table>
              ) : (
                <WmsListEmptyState
                  hasFilters={hasFilters}
                  canCreate={perms.add}
                  onClearFilters={clearFilters}
                  onCreate={handleNewPosition}
                  emptyTitle="No hay posiciones"
                  emptyDescription="Comienza creando la primera posición del almacén."
                  filtersTitle="No se encontraron posiciones"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros."
                  createLabel="Nueva posición"
                />
              )}
            </Card.Body>

            {positions.length > 0 && (
              <Card.Footer>
                <div className="d-flex flex-column flex-md-row align-items-center gap-3">
                  <div className="text-sm text-slate-600 text-center text-md-start">
                    Mostrando del{" "}
                    <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong> al{" "}
                    <strong>{Math.min(currentPage * PAGE_SIZE, totalItems)}</strong> de{" "}
                    <strong>{totalItems}</strong> registros
                  </div>
                  {totalPages > 1 && (
                    <Pagination className="pagination mb-0 ms-md-auto">
                      <Pagination.Prev
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((page) => page - 1)}
                      />
                      {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = index + 1;
                        } else if (currentPage <= 3) {
                          pageNum = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + index;
                        } else {
                          pageNum = currentPage - 2 + index;
                        }
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
                        onClick={() => setCurrentPage((page) => page + 1)}
                      />
                    </Pagination>
                  )}
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>

      <ModalEdit
        show={showModal}
        onHide={handleCloseModal}
        position={selectedPosition}
        mode={modalMode}
        onSave={loadPositions}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => {
          setShowConfirmModal(false);
          setBulkDeleteIds(null);
        }}
        position={selectedPosition}
        positionIds={bulkDeleteIds || undefined}
        onDelete={handleAfterDelete}
        showAlert={showAlertMessage}
      />

      <ModalBulkFlags
        show={showBulkFlagsModal}
        onHide={() => setShowBulkFlagsModal(false)}
        positionIds={selectedIds}
        onSaved={async () => {
          setSelectedIds([]);
          await loadPositions();
        }}
        showAlert={showAlertMessage}
      />

      <ModalBulkPrint
        show={showBulkPrintModal}
        onHide={() => setShowBulkPrintModal(false)}
        positionIds={selectedIds}
        onPrinted={() => setSelectedIds([])}
        showAlert={showAlertMessage}
      />

      <ModalBulkRegenerate
        show={showBulkRegenerateModal}
        onHide={() => setShowBulkRegenerateModal(false)}
        positionIds={selectedIds}
        onDone={async () => {
          setSelectedIds([]);
          await loadPositions();
        }}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
