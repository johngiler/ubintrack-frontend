"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Filter, FilterX, Pencil, Plus, Trash2, UserCog } from "lucide-react";
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
import UsersViewSkeleton from "./UsersViewSkeleton";
import { getUsers } from "@/services/coreService";
import { getUserRoleLabel } from "@/lib/wmsUserDisplay";
import { canCRUD } from "@/services/httpClient";
import { formatDate } from "@/lib/format";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  user_type: "",
  is_active: "",
};

export default function UsersView() {
  const authUser = useAuth().user;
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const {
    historyOpen,
    historyType,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);
  const perms = canCRUD(authUser, "core", "customuser");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.user_type, filters.is_active]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const listFilters = { ...filters, staff_only: true };

  const {
    results: users,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadUsers,
  } = usePaginatedList({
    key: swrKeys.users(currentPage, debouncedSearchTerm, listFilters),
    fetcher: () => getUsers(currentPage, debouncedSearchTerm, listFilters),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar los usuarios");
  }, [error, showAlertMessage]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
  };

  const handleShowModal = (staffUser, mode) => {
    setSelectedUser(staffUser);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleNewUser = () => {
    setSelectedUser(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const activeFilterCount = [
    filters.user_type,
    filters.is_active,
  ].filter(Boolean).length;

  const hasFilters = Boolean(debouncedSearchTerm) || activeFilterCount > 0;

  const userTypeOptions = [
    { value: "administrador", label: "Administrador" },
    { value: "empleado", label: "Empleado" },
  ];
  const statusOptions = [
    { value: "true", label: "Activo" },
    { value: "false", label: "Inactivo" },
  ];

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Usuarios"
        description="Administra administradores y empleados del workspace."
        icon={UserCog}
        breadcrumbs={[
          { title: "Principal", active: true },
          { title: "Usuarios", active: true },
        ]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <WmsSearchBar
                    id="search-user"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm("")}
                    placeholder="Buscar usuario"
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
                        onClick={handleNewUser}
                      >
                        Nuevo usuario
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {filtersOpen ? (
                    <motion.div
                      key="users-filters"
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
                            options={userTypeOptions}
                            value={filters.user_type}
                            onChange={(e) => handleFilterChange("user_type", e.target.value || "")}
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
                            value={filters.is_active}
                            onChange={(e) => handleFilterChange("is_active", e.target.value || "")}
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
                <UsersViewSkeleton />
              ) : users.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[880px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                        Nombre
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[200px] normal-case tracking-normal">
                        Email
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Tipo
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[140px] normal-case tracking-normal">
                        Perfil
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
                    {users.map((staffUser) => (
                      <Table.Row key={staffUser.id}>
                        <Table.Cell>
                          <span className="font-medium text-slate-900">
                            {staffUser.full_name || "—"}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-slate-600">{staffUser.email}</Table.Cell>
                        <Table.Cell>
                          <Badge
                            variant={
                              staffUser.user_type === "administrador" ? "primary" : "secondary"
                            }
                            dot={false}
                          >
                            {getUserRoleLabel(staffUser)}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell className="text-slate-600">
                          {staffUser.user_type === "empleado" ? staffUser.profile || "—" : "—"}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap text-slate-600">
                          {staffUser.date_joined ? formatDate(staffUser.date_joined) : "—"}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant={staffUser.is_active ? "success" : "danger"} dot={false}>
                            {staffUser.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              className="text-sky-600 hover:bg-sky-50"
                              onClick={() => handleShowModal(staffUser, "view")}
                              title="Ver usuario"
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            {perms.change && (
                              <IconButton
                                size="sm"
                                className="text-violet-600 hover:bg-violet-50"
                                onClick={() => handleShowModal(staffUser, "edit")}
                                title="Editar usuario"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            )}
                            {perms.delete && staffUser.id !== authUser?.id && (
                              <IconButton
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedUser(staffUser);
                                  setShowConfirmModal(true);
                                }}
                                title="Eliminar usuario"
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
                  onCreate={handleNewUser}
                  emptyTitle="No hay usuarios"
                  emptyDescription="Comienza registrando administradores o empleados del workspace."
                  filtersTitle="No se encontraron usuarios"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros para encontrar el usuario que buscas."
                  createLabel="Nuevo usuario"
                />
              )}
            </Card.Body>

            {users.length > 0 && (
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
        user={selectedUser}
        mode={modalMode}
        onSave={loadUsers}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        user={selectedUser}
        onDelete={loadUsers}
        showAlert={showAlertMessage}
      />

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="user"
        title="Historial de movimientos de usuarios"
        initialAction={historyType}
        initialBatchId={historyBatch}
      />
    </Fragment>
  );
}
