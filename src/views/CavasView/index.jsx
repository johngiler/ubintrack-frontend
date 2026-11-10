"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Building, Eye, FilterX, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";

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
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import CavasViewSkeleton from "./CavasViewSkeleton";
import { getCavas, getCavaPositionTotals } from "@/services/storageService";
import { canCRUD } from "@/services/httpClient";
import { cavaTitleOf } from "./cavaPlan";
import { ConditionBadge } from "./cavaLabels";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";

const PAGE_SIZE = 20;

function formatTemperature(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}°C`;
}

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("es-CO");
}

export default function CavasView() {
  const user = useAuth().user;
  const perms = canCRUD(user, "storage", "cava");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCava, setSelectedCava] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: cavas,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadCavas,
  } = usePaginatedList({
    key: swrKeys.cavas(currentPage, debouncedSearchTerm),
    fetcher: () => getCavas(currentPage, debouncedSearchTerm, PAGE_SIZE),
    pageSize: PAGE_SIZE,
  });

  const { data: positionTotals, mutate: loadPositionTotals } = useSWR(
    ["cavas", "position-totals", debouncedSearchTerm || ""],
    () => getCavaPositionTotals(debouncedSearchTerm),
  );

  const refreshCavas = useCallback(async () => {
    await Promise.all([loadCavas(), loadPositionTotals()]);
  }, [loadCavas, loadPositionTotals]);

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar las cámaras");
  }, [error, showAlertMessage]);

  const clearFilters = () => {
    setSearchTerm("");
  };

  const handleShowModal = (cava, mode) => {
    setSelectedCava(cava);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCava(null);
  };

  const handleNewCava = () => {
    setSelectedCava(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const hasFilters = Boolean(debouncedSearchTerm);

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Cámaras"
        description="Administra las cámaras y sus condiciones de almacenamiento."
        icon={Building}
        breadcrumbs={[
          { title: "Bodega", active: true },
          { title: "Cámaras", active: true },
        ]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-nowrap items-center gap-2">
                <WmsSearchBar
                  id="search-cava"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
                  placeholder="Buscar cámara"
                  className="!w-[220px] !min-w-[220px] !max-w-[220px] shrink-0"
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
                      onClick={handleNewCava}
                    >
                      Nueva cámara
                    </Button>
                  )}
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {isLoading ? (
                <CavasViewSkeleton />
              ) : cavas.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[980px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                        Nombre
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[160px] normal-case tracking-normal">
                        Almacén
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Condición
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Temp. min / max
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Activas / total
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[100px] normal-case tracking-normal">
                        Estado
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Acciones
                      </Table.HeaderCell>
                    </tr>
                  </Table.Head>
                  <Table.Body>
                    {cavas.map((cava) => (
                      <Table.Row key={cava.id}>
                        <Table.Cell>
                          <span className="font-medium text-slate-900">{cavaTitleOf(cava.name, cava.code)}</span>
                        </Table.Cell>
                        <Table.Cell className="text-slate-600">
                          {cava.storage?.name || "—"}
                        </Table.Cell>
                        <Table.Cell>
                          <ConditionBadge condition={cava.condition} />
                        </Table.Cell>
                        <Table.Cell className="text-sm text-slate-600">
                          <span className="tabular-nums">
                            {formatTemperature(cava.temp_min)}
                            <span className="mx-1 text-slate-300">/</span>
                            {formatTemperature(cava.temp_max)}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-sm text-slate-600">
                          <span className="tabular-nums font-medium text-slate-800">
                            {formatCount(cava.active_slot_count)}
                          </span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className="tabular-nums text-slate-500">
                            {formatCount(cava.slot_count)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant={cava.is_active ? "success" : "danger"} dot={false}>
                            {cava.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              className="text-sky-600 hover:bg-sky-50"
                              onClick={() => handleShowModal(cava, "view")}
                              title="Ver cava"
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            {perms.change && (
                              <IconButton
                                size="sm"
                                className="text-violet-600 hover:bg-violet-50"
                                onClick={() => handleShowModal(cava, "edit")}
                                title="Editar cava"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            )}
                            {perms.delete && (
                              <IconButton
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedCava(cava);
                                  setShowConfirmModal(true);
                                }}
                                title="Eliminar cava"
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              ) : (
                <WmsListEmptyState
                  hasFilters={hasFilters}
                  canCreate={perms.add}
                  onClearFilters={clearFilters}
                  onCreate={handleNewCava}
                  emptyTitle="No hay cámaras"
                  emptyDescription="Comienza creando la primera cámara del almacén."
                  filtersTitle="No se encontraron cámaras"
                  filtersDescription="Intenta ajustar tu búsqueda para encontrar la cámara que buscas."
                  createLabel="Nueva cámara"
                />
              )}
            </Card.Body>

            {cavas.length > 0 && (
              <Card.Footer>
                <div className="d-flex flex-column flex-md-row align-items-center gap-3">
                  <div className="text-sm text-slate-600 text-center text-md-start">
                    Mostrando del{" "}
                    <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong> al{" "}
                    <strong>{Math.min(currentPage * PAGE_SIZE, totalItems)}</strong> de{" "}
                    <strong>{totalItems}</strong> registros
                    {positionTotals ? (
                      <>
                        <span className="mx-2 text-slate-300">·</span>
                        Posiciones{" "}
                        <strong className="tabular-nums">
                          {formatCount(positionTotals.active)}
                        </strong>
                        <span className="mx-1 text-slate-300">/</span>
                        <strong className="tabular-nums">
                          {formatCount(positionTotals.total)}
                        </strong>
                        <span className="ml-1 text-slate-400">(activas / total)</span>
                      </>
                    ) : null}
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
        cava={selectedCava}
        mode={modalMode}
        onSave={refreshCavas}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        cava={selectedCava}
        onDelete={refreshCavas}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
