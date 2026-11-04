"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Download, Eye, FilterX, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import { getClients, exportClientsToExcel } from "@/services/coreService";
import { getTariffs } from "@/services/financeService";
import { canCRUD } from "@/services/httpClient";
import { formatDate } from "@/lib/format";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  is_active: "",
  tariff: "",
};

export default function ClientsView() {
  const user = useAuth().user;
  const perms = canCRUD(user, "core", "client");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const { data: tariffsData } = useSWR(swrKeys.tariffsAll, () => getTariffs(1, ""));
  const tariffs = tariffsData?.results || [];

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.is_active, filters.tariff]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: clients,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadClients,
  } = usePaginatedList({
    key: swrKeys.clients(currentPage, debouncedSearchTerm, filters),
    fetcher: () => getClients(currentPage, debouncedSearchTerm, filters),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar los clientes");
  }, [error, showAlertMessage]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
  };

  const handleShowModal = (client, mode) => {
    setSelectedClient(client);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const result = await exportClientsToExcel({
        filters,
        search: debouncedSearchTerm,
        filename: `Clientes_${new Date().toISOString().split("T")[0]}.xls`,
      });
      if (result.success) {
        showAlertMessage("success", "Archivo Excel descargado correctamente");
      } else {
        showAlertMessage("danger", "Error al descargar el archivo Excel");
      }
    } catch {
      showAlertMessage("danger", "Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters =
    Boolean(debouncedSearchTerm) || Boolean(filters.is_active) || Boolean(filters.tariff);

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Clientes"
        description="Administra los clientes del almacén, sus sucursales y usuarios."
        icon={Users}
        breadcrumbs={[
          { title: "Principal", active: true },
          { title: "Clientes", active: true },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportExcel}
            disabled={isExporting}
            loading={isExporting}
          >
            {isExporting ? "Exportando…" : "Exportar a excel"}
          </Button>
        }
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto">
                <WmsSearchBar
                  id="search-client"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
                  placeholder="Buscar cliente"
                  className="!w-[220px] !min-w-[220px] !max-w-[220px] shrink-0"
                />
                <Form.Select
                  id="filter-client-tariff"
                  name="filter-client-tariff"
                  size="sm"
                  value={filters.tariff}
                  onChange={(e) => handleFilterChange("tariff", e.target.value)}
                  aria-label="Filtrar por tarifa"
                  className="!w-[150px] shrink-0"
                  style={{ minWidth: "150px" }}
                >
                  <option value="">Todas las tarifas</option>
                  <option value="none">Sin tarifa</option>
                  {tariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select
                  id="filter-client-status"
                  name="filter-client-status"
                  size="sm"
                  value={filters.is_active}
                  onChange={(e) => handleFilterChange("is_active", e.target.value)}
                  aria-label="Filtrar por estado"
                  className="!w-[140px] shrink-0"
                  style={{ minWidth: "140px" }}
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
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
                      onClick={handleNewClient}
                    >
                      Nuevo cliente
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
              ) : clients.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[920px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[200px] normal-case tracking-normal">
                        Nombre
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Tarifa
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[110px] normal-case tracking-normal">
                        Sucursales
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[100px] normal-case tracking-normal">
                        Usuarios
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[130px] normal-case tracking-normal">
                        Fecha de creación
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
                    {clients.map((client) => (
                      <Table.Row key={client.id}>
                        <Table.Cell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-900">{client.name}</span>
                            {client.company ? (
                              <span className="text-xs text-slate-500">{client.company}</span>
                            ) : null}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {client.tariff?.name ? (
                            <span className="text-slate-700">{client.tariff.name}</span>
                          ) : (
                            <span className="text-slate-400">Sin tarifa</span>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-slate-600">
                          {client.branches?.length || 0} sucursales
                        </Table.Cell>
                        <Table.Cell className="text-slate-600">
                          {client.client_users?.length || 0} usuarios
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap text-slate-600">
                          {formatDate(client.created_at)}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant={client.is_active ? "success" : "danger"} dot={false}>
                            {client.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              className="text-sky-600 hover:bg-sky-50"
                              onClick={() => handleShowModal(client, "view")}
                              title="Ver cliente"
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            {perms.change && (
                              <IconButton
                                size="sm"
                                className="text-violet-600 hover:bg-violet-50"
                                onClick={() => handleShowModal(client, "edit")}
                                title="Editar cliente"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            )}
                            {perms.delete && (
                              <IconButton
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowConfirmModal(true);
                                }}
                                title="Eliminar cliente"
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
                  onCreate={handleNewClient}
                  emptyTitle="No hay clientes"
                  emptyDescription="Comienza registrando el primer cliente del almacén."
                  filtersTitle="No se encontraron clientes"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros para encontrar el cliente que buscas."
                  createLabel="Nuevo cliente"
                />
              )}
            </Card.Body>

            {clients.length > 0 && (
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
        client={selectedClient}
        mode={modalMode}
        onSave={loadClients}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        client={selectedClient}
        onDelete={loadClients}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
