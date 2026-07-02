"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  FilterX,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
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
  const searchParams = useSearchParams();
  const perms = canCRUD(user, "finance", "tariff");

  const [tariffs, setTariffs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTariffId, setExpandedTariffId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.has_picking_tariff]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const loadTariffs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTariffs(currentPage, debouncedSearchTerm, filters);
      setTariffs(data.results || []);
      setTotalItems(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
    } catch {
      showAlertMessage("danger", "Error al cargar las tarifas");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, filters, showAlertMessage]);

  useEffect(() => {
    loadTariffs();
  }, [loadTariffs]);

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
    setDebouncedSearchTerm("");
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

  const hasFilters =
    Boolean(debouncedSearchTerm) || Boolean(filters.has_picking_tariff);

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
              <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto">
                <WmsSearchBar
                  id="search-tariff"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
                  placeholder="Buscar por nombre…"
                  className="!w-[240px] !min-w-[240px] !max-w-[240px] shrink-0"
                />
                <Form.Select
                  id="filter-tariff-picking"
                  name="filter-tariff-picking"
                  size="sm"
                  value={filters.has_picking_tariff}
                  onChange={(e) => handleFilterChange("has_picking_tariff", e.target.value)}
                  aria-label="Filtrar por picking"
                  className="!w-[170px] shrink-0"
                  style={{ minWidth: "170px" }}
                >
                  <option value="">Todos (picking)</option>
                  <option value="true">Con tarifa picking</option>
                  <option value="false">Sin tarifa picking</option>
                </Form.Select>
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
                      onClick={handleNewTariff}
                    >
                      Nueva tarifa
                    </Button>
                  )}
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {isLoading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando…</span>
                  </div>
                </div>
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
    </Fragment>
  );
}
