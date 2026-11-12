"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  Filter,
  FilterX,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import SectionHistoryModal from "@/components/activity/SectionHistoryModal";
import ViewHistoryButton from "@/components/activity/ViewHistoryButton";
import { useViewHistory } from "@/hooks/useViewHistory";
import { useWmsSearchParams } from "@/hooks/useWmsRouter";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";

import {
  Card,
  Col,
  Row,
  Button,
  Alert,
  Pagination,
  Form,
  Table,
} from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import TariffsViewSkeleton from "./TariffsViewSkeleton";
import { getTariffs } from "@/services/financeService";
import { canCRUD } from "@/services/httpClient";
import { formatPercentRate } from "./tariffLabels";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import TariffExpandedDetails from "./components/TariffExpandedDetails";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  has_picking_tariff: "",
};

export default function TariffsView() {
  const user = useAuth().user;
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const {
    historyOpen,
    historyType,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);
  const perms = canCRUD(user, "finance", "tariff");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedTariffId, setExpandedTariffId] = useState(null);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.has_picking_tariff]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: tariffs,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadTariffs,
  } = usePaginatedList({
    key: swrKeys.tariffs(currentPage, debouncedSearchTerm, filters),
    fetcher: () => getTariffs(currentPage, debouncedSearchTerm, filters),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar las tarifas");
  }, [error, showAlertMessage]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !perms.add) return;
    setSelectedTariff(null);
    setModalMode("new");
    setShowModal(true);
  }, [searchParams, perms.add]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
  };

  const handleShowModal = (tariff, mode) => {
    setSelectedTariff(tariff);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTariff(null);
  };

  const handleNewTariff = () => {
    setSelectedTariff(null);
    setModalMode("new");
    setShowModal(true);
  };

  const toggleExpand = (tariffId) => {
    setExpandedTariffId((prev) => (prev === tariffId ? null : tariffId));
  };

  const activeFilterCount = [
    filters.has_picking_tariff,
  ].filter(Boolean).length;

  const hasFilters = Boolean(debouncedSearchTerm) || activeFilterCount > 0;

  const pickingOptions = [
    { value: "true", label: "Con tarifa picking" },
    { value: "false", label: "Sin tarifa picking" },
  ];

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Tarifas"
        description="Configura tarifas de almacenamiento, movimientos y servicios adicionales."
        icon={DollarSign}
        breadcrumbs={[
          { title: "Finanzas", active: true },
          { title: "Tarifas", active: true },
        ]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <WmsSearchBar
                    id="search-tariff"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm("")}
                    placeholder="Buscar por nombre…"
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
                    <ViewHistoryButton onClick={openHistory} />
                    {perms.add && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        className="whitespace-nowrap"
                        onClick={handleNewTariff}
                      >
                        Nueva tarifa
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {filtersOpen ? (
                    <motion.div
                      key="tariffs-filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {/* p-1: el anillo de focus de react-select no debe quedar recortado por overflow-hidden */}
                      <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Picking</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por picking"
                            placeholder="Todos"
                            options={pickingOptions}
                            value={filters.has_picking_tariff}
                            onChange={(e) => handleFilterChange("has_picking_tariff", e.target.value || "")}
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
                <TariffsViewSkeleton />
              ) : tariffs.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[720px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[220px] normal-case tracking-normal">
                        Nombre
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[140px] text-center normal-case tracking-normal">
                        Picking
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[100px] text-center normal-case tracking-normal">
                        Umbral
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] text-center normal-case tracking-normal">
                        Penalización
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Acciones
                      </Table.HeaderCell>
                    </tr>
                  </Table.Head>
                  <Table.Body>
                    {tariffs.map((tariff) => {
                      const isExpanded = expandedTariffId === tariff.id;

                      return (
                        <Fragment key={tariff.id}>
                          <Table.Row className={isExpanded ? "bg-slate-50/80" : undefined}>
                            <Table.Cell>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:text-sky-700"
                                onClick={() => toggleExpand(tariff.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                )}
                                {tariff.name}
                              </button>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                              {tariff.has_picking_tariff ? (
                                <Badge variant="success" dot={false}>
                                  Activo (${tariff.picking})
                                </Badge>
                              ) : (
                                <Badge variant="secondary" dot={false}>
                                  Inactivo
                                </Badge>
                              )}
                            </Table.Cell>
                            <Table.Cell className="text-center">
                              <Badge variant="info" dot={false}>
                                {formatPercentRate(tariff.rotation_threshold, 0.4)}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                              <Badge variant="warning" dot={false}>
                                {formatPercentRate(tariff.static_penalty_rate, 0.8)}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-1">
                                <IconButton
                                  size="sm"
                                  className="text-sky-600 hover:bg-sky-50"
                                  onClick={() => handleShowModal(tariff, "view")}
                                  title="Ver tarifa"
                                >
                                  <Eye className="h-4 w-4" />
                                </IconButton>
                                {perms.change && (
                                  <IconButton
                                    size="sm"
                                    className="text-violet-600 hover:bg-violet-50"
                                    onClick={() => handleShowModal(tariff, "edit")}
                                    title="Editar tarifa"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </IconButton>
                                )}
                                {perms.delete && (
                                  <IconButton
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedTariff(tariff);
                                      setShowConfirmModal(true);
                                    }}
                                    title="Eliminar tarifa"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </IconButton>
                                )}
                              </div>
                            </Table.Cell>
                          </Table.Row>

                          {isExpanded ? (
                            <Table.Row>
                              <Table.Cell colSpan={5} className="!p-0">
                                <TariffExpandedDetails tariff={tariff} />
                              </Table.Cell>
                            </Table.Row>
                          ) : null}
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
                  onCreate={handleNewTariff}
                  emptyTitle="No hay tarifas registradas"
                  emptyDescription="Comienza creando tu primera tarifa de servicio."
                  filtersTitle="No se encontraron tarifas"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros para encontrar la tarifa que buscas."
                  createLabel="Nueva tarifa"
                />
              )}
            </Card.Body>

            {tariffs.length > 0 && (
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
                        onClick={() => setCurrentPage((p) => p - 1)}
                      />
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
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
                        onClick={() => setCurrentPage((p) => p + 1)}
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
        tariff={selectedTariff}
        mode={modalMode}
        onSave={loadTariffs}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        tariff={selectedTariff}
        onDelete={loadTariffs}
        showAlert={showAlertMessage}
      />

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="tariff"
        title="Historial de movimientos de tarifas"
        initialAction={historyType}
        initialBatchId={historyBatch}
      />
    </Fragment>
  );
}
