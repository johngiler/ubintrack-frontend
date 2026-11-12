"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Eye, FilterX, Pencil, Plus, Trash2 } from "lucide-react";
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
import StoragesViewSkeleton from "./StoragesViewSkeleton";
import { getStorages } from "@/services/storageService";
import { canCRUD } from "@/services/httpClient";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";

const PAGE_SIZE = 20;

export default function StoragesView() {
  const user = useAuth().user;
  const searchParams = useSearchParams();
  const perms = canCRUD(user, "storage", "storage");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState(null);
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
    results: storages,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadStorages,
  } = usePaginatedList({
    key: swrKeys.storages(currentPage, debouncedSearchTerm),
    fetcher: () => getStorages(currentPage, debouncedSearchTerm, PAGE_SIZE),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar las bodegas");
  }, [error, showAlertMessage]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !perms.add) return;
    setSelectedStorage(null);
    setModalMode("edit");
    setShowModal(true);
  }, [searchParams, perms.add]);

  const clearFilters = () => {
    setSearchTerm("");
  };

  const handleShowModal = (storage, mode) => {
    setSelectedStorage(storage);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStorage(null);
  };

  const handleNewStorage = () => {
    setSelectedStorage(null);
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
        title="Bodegas"
        description="Administra las bodegas del almacén."
        icon={Building2}
        breadcrumbs={[
          { title: "Bodega", active: true },
          { title: "Bodegas", active: true },
        ]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-nowrap items-center gap-2">
                <WmsSearchBar
                  id="search-storage"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
                  placeholder="Buscar bodega"
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
                    Limpiar
                  </Button>
                )}
                <div className="ml-auto shrink-0 pl-2">
                  {perms.add && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      className="whitespace-nowrap"
                      onClick={handleNewStorage}
                    >
                      Nueva bodega
                    </Button>
                  )}
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {isLoading ? (
                <StoragesViewSkeleton />
              ) : storages.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[480px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[240px] normal-case tracking-normal">
                        Nombre
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Estado
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Acciones
                      </Table.HeaderCell>
                    </tr>
                  </Table.Head>
                  <Table.Body>
                    {storages.map((storage) => (
                      <Table.Row key={storage.id}>
                        <Table.Cell>
                          <span className="font-medium text-slate-900">{storage.name}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant={storage.is_active ? "success" : "danger"} dot={false}>
                            {storage.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              className="text-sky-600 hover:bg-sky-50"
                              onClick={() => handleShowModal(storage, "view")}
                              title="Ver bodega"
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            {perms.change && (
                              <IconButton
                                size="sm"
                                className="text-violet-600 hover:bg-violet-50"
                                onClick={() => handleShowModal(storage, "edit")}
                                title="Editar bodega"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            )}
                            {perms.delete && (
                              <IconButton
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedStorage(storage);
                                  setShowConfirmModal(true);
                                }}
                                title="Eliminar bodega"
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
                  onCreate={handleNewStorage}
                  emptyTitle="No hay bodegas"
                  emptyDescription="Comienza creando la primera bodega del almacén."
                  filtersTitle="No se encontraron bodegas"
                  filtersDescription="Intenta ajustar tu búsqueda para encontrar la bodega que buscas."
                  createLabel="Nueva bodega"
                />
              )}
            </Card.Body>

            {storages.length > 0 && (
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
        storage={selectedStorage}
        mode={modalMode}
        onSave={loadStorages}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        storage={selectedStorage}
        onDelete={loadStorages}
        showAlert={showAlertMessage}
      />
    </Fragment>
  );
}
