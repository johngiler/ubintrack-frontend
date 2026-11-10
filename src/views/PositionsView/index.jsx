"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FilterX,
  Grid3x3,
  Pencil,
  Plus,
  Printer,
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
  getCavas,
  getCava,
  printPosition,
} from "@/services/storageService";
import { canCRUD } from "@/services/httpClient";
import { aisleDisplayName, isSectionBlock } from "../CavasView/cavaPlan";
import { cavaTitleOf, statusBadgeVariant, statusLabels } from "./positionLabels";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import PositionExpandedBins from "./components/PositionExpandedBins";

const PAGE_SIZE = 50;

const EMPTY_FILTERS = {
  status: "",
  hall: "",
  cava_id: "",
  is_active: "",
};

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
  }, [debouncedSearchTerm, filters.status, filters.hall, filters.cava_id, filters.is_active]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const apiFilters = {
    ...filters,
    page_size: PAGE_SIZE,
    is_active:
      filters.is_active === ""
        ? undefined
        : filters.is_active === "true" || filters.is_active === true,
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

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
    setSearchParams({});
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

  const hasFilters =
    Boolean(debouncedSearchTerm) ||
    Boolean(filters.status) ||
    Boolean(filters.hall) ||
    Boolean(filters.cava_id) ||
    Boolean(filters.is_active);

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
              <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto p-0.5">
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
                  className="!w-[280px] !min-w-[280px] !max-w-[280px] shrink-0"
                />
                <Select
                  size="sm"
                  isClearable
                  aria-label="Filtrar por cava"
                  placeholder="Cava"
                  className="!w-[200px] shrink-0"
                  options={cavaOptions}
                  value={filters.cava_id}
                  onChange={(e) => handleFilterChange("cava_id", e.target.value || "")}
                />
                <Select
                  size="sm"
                  isClearable
                  aria-label="Filtrar por pasillo o túnel"
                  placeholder="Pasillo / túnel"
                  className="!w-[140px] shrink-0"
                  options={hallOptions}
                  value={filters.hall}
                  onChange={(e) => handleFilterChange("hall", e.target.value || "")}
                  noOptionsMessage={() =>
                    filters.cava_id ? "Sin secciones" : "Sin tokens"
                  }
                />
                <Select
                  size="sm"
                  isClearable
                  aria-label="Filtrar por estado"
                  placeholder="Estado"
                  className="!w-[130px] shrink-0"
                  options={statusOptions}
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value || "")}
                />
                <Select
                  size="sm"
                  isClearable
                  aria-label="Filtrar por activo"
                  placeholder="Activo"
                  className="!w-[110px] shrink-0"
                  options={activeOptions}
                  value={filters.is_active}
                  onChange={(e) => handleFilterChange("is_active", e.target.value || "")}
                />
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FilterX}
                    onClick={clearFilters}
                    title="Limpiar filtros"
                    className="shrink-0 whitespace-nowrap"
                  >
                    Limpiar filtros
                  </Button>
                )}
                <div className="ml-auto shrink-0 pl-2">
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
            </Card.Header>

            <Card.Body className="p-0">
              {isLoading ? (
                <PositionsViewSkeleton />
              ) : positions.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[960px]">
                  <Table.Head>
                    <tr>
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
                      const currentBin =
                        position.bins?.find((bin) => bin.status === "almacenado") ||
                        position.bins?.find((bin) => bin.status !== "despachado");
                      const hallToken = String(position.hall || "").trim();

                      return (
                        <Fragment key={position.id}>
                          <Table.Row>
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
                                <td colSpan={7} className="p-0">
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
        onHide={() => setShowConfirmModal(false)}
        position={selectedPosition}
        onDelete={loadPositions}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
