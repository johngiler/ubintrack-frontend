"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Filter, FilterX, Pencil, Plus, Shield, Trash2 } from "lucide-react";
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
import ProfilesViewSkeleton from "./ProfilesViewSkeleton";
import { getProfiles } from "@/services/coreService";
import { getProfileUserTypeLabel } from "@/lib/wmsUserDisplay";
import { canCRUD } from "@/services/httpClient";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  is_active: "",
  user_type: "",
};

export default function ProfilesView() {
  const user = useAuth().user;
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const {
    historyOpen,
    historyType,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);
  const perms = canCRUD(user, "core", "profile");

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.is_active, filters.user_type]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: profiles,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadProfiles,
  } = usePaginatedList({
    key: swrKeys.profiles(currentPage, debouncedSearchTerm, filters),
    fetcher: () => getProfiles(currentPage, debouncedSearchTerm, filters),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar los perfiles");
  }, [error, showAlertMessage]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
  };

  const handleShowModal = (profile, mode) => {
    setSelectedProfile(profile);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProfile(null);
  };

  const handleNewProfile = () => {
    setSelectedProfile(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const activeFilterCount = [
    filters.user_type,
    filters.is_active,
  ].filter(Boolean).length;

  const hasFilters = Boolean(debouncedSearchTerm) || activeFilterCount > 0;

  const userTypeOptions = [
    { value: "cliente", label: "Cliente" },
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
        title="Perfiles"
        description="Administra los perfiles de acceso y sus permisos en el workspace."
        icon={Shield}
        breadcrumbs={[
          { title: "Principal", active: true },
          { title: "Perfiles", active: true },
        ]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 px-4 py-3">
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <WmsSearchBar
                    id="search-profile"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm("")}
                    placeholder="Buscar perfil"
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
                        onClick={handleNewProfile}
                      >
                        Nuevo perfil
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {filtersOpen ? (
                    <motion.div
                      key="profiles-filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {/* p-1: el anillo de focus de react-select no debe quedar recortado por overflow-hidden */}
                      <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Tipo de usuario</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por tipo de usuario"
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
                <ProfilesViewSkeleton />
              ) : profiles.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[720px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                        Nombre
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Tipo
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[280px] normal-case tracking-normal">
                        Permisos
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[100px] normal-case tracking-normal">
                        Usuarios
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
                    {profiles.map((profile) => (
                      <Table.Row key={profile.id}>
                        <Table.Cell>
                          <span className="font-medium text-slate-900">{profile.name}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            variant={profile.user_type === "cliente" ? "info" : "secondary"}
                            dot={false}
                          >
                            {getProfileUserTypeLabel(profile.user_type)}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-800">
                              {profile.permissions?.length || 0} permisos
                            </span>
                            {profile.permissions?.length > 0 && (
                              <span className="text-xs text-slate-500 leading-relaxed">
                                {profile.permissions.map((p) => p.name).join(" | ")}
                              </span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-slate-600">
                          {profile.users_count ?? 0} usuarios
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant={profile.is_active ? "success" : "danger"} dot={false}>
                            {profile.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              className="text-sky-600 hover:bg-sky-50"
                              onClick={() => handleShowModal(profile, "view")}
                              title="Ver perfil"
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            {perms.change && (
                              <IconButton
                                size="sm"
                                className="text-violet-600 hover:bg-violet-50"
                                onClick={() => handleShowModal(profile, "edit")}
                                title="Editar perfil"
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            )}
                            {perms.delete && (
                              <IconButton
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedProfile(profile);
                                  setShowConfirmModal(true);
                                }}
                                title="Eliminar perfil"
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
                  onCreate={handleNewProfile}
                  emptyTitle="No hay perfiles"
                  emptyDescription="Comienza creando el primer perfil de acceso del workspace."
                  filtersTitle="No se encontraron perfiles"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros para encontrar el perfil que buscas."
                  createLabel="Nuevo perfil"
                />
              )}
            </Card.Body>

            {profiles.length > 0 && (
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
        profile={selectedProfile}
        mode={modalMode}
        onSave={loadProfiles}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        profile={selectedProfile}
        onDelete={loadProfiles}
        showAlert={showAlertMessage}
      />

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="profile"
        title="Historial de movimientos de perfiles"
        initialAction={historyType}
        initialBatchId={historyBatch}
      />
    </Fragment>
  );
}
