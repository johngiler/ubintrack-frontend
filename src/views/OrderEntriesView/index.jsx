"use client";

import { Fragment, useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FilterX,
  PackageOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useWmsNavigate, useWmsSearchParams } from "@/hooks/useWmsRouter";
import {
  Card,
  Col,
  Row,
  Button,
  Pagination,
  Alert,
  Form,
  Table,
} from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";

import {
  getEntries,
  createEntry,
  updateEntry,
  patchEntry,
  deleteEntry,
  createEntryProduct,
  updateEntryProduct,
  deleteEntryProduct,
  createEntryDetail,
  updateEntryDetail,
  completeEntry,
} from "@/services/orderService";

import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import {
  WmsExpandItemsButton,
} from "@/components/wms/WmsExpandItemsButton";
import EntriesEmptyState from "./components/EntriesEmptyState";
import EntryExpandedProducts from "./components/EntryExpandedProducts";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import ModalComplete from "./components/ModalComplete";
import { canCRUD } from "@/services/httpClient";
import { exportEntryOrdersToExcel } from "@/services/orderService";
import { formatDate } from "@/lib/format";

const statusVariants = {
  pendiente: "warning",
  en_progreso: "primary",
  completada: "success",
  cancelada: "danger",
};

const EMPTY_FILTERS = {
  status: "",
  condition: "",
};

const statusLabels = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const conditionLabels = {
  Congelado: "Congelado",
  Refrigerado: "Refrigerado",
  Seco: "Seco",
};

const inTypeLabels = {
  Palletizado: "Palletizado",
  Piso: "Piso",
};

const Entries = () => {
  const user = useAuth().user;
  const perms = canCRUD(user, "order", "entry");
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const navigate = useWmsNavigate();
  const [entries, setEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [entryToComplete, setEntryToComplete] = useState(null);

  const PAGE_SIZE = 20;

  // Carga inicial: verificar parámetros de URL primero
  useEffect(() => {
    // Evitar doble ejecución en StrictMode
    if (isInitialized) return;

    const initializeComponent = async () => {
      const entryId = searchParams.get("entry_id");
      const entryCode = searchParams.get("entry_code");

      if (entryCode) {
        // Si hay código directamente, usarlo
        setSearchTerm(entryCode);
        setDebouncedSearchTerm(entryCode);
        // Cargar con el filtro aplicado
        try {
          const response = await getEntries(1, {}, entryCode);
          setEntries(response.results);
          setTotalItems(response.count);
          setTotalPages(Math.ceil(response.count / PAGE_SIZE));
          setIsLoading(false);
          setIsInitialized(true);
        } catch (error) {
          console.error("Error al cargar las entradas:", error);
          await loadEntriesInitial();
        }
      } else if (entryId) {
        // Hay un ID de entrada, buscar el código
        try {
          const response = await getEntries(1, {}, "");
          const loadedEntries = response.results;
          const entry = loadedEntries.find((e) => e.id === parseInt(entryId));
          if (entry && entry.code) {
            setSearchTerm(entry.code);
            setDebouncedSearchTerm(entry.code);
            // Cargar con el filtro aplicado
            const filteredResponse = await getEntries(1, {}, entry.code);
            setEntries(filteredResponse.results);
            setTotalItems(filteredResponse.count);
            setTotalPages(Math.ceil(filteredResponse.count / PAGE_SIZE));
            setIsLoading(false);
            setIsInitialized(true);
          } else {
            setEntries(loadedEntries);
            setTotalItems(response.count);
            setTotalPages(Math.ceil(response.count / PAGE_SIZE));
            setIsLoading(false);
            setIsInitialized(true);
          }
        } catch (error) {
          console.error("Error al cargar las entradas:", error);
          await loadEntriesInitial();
        }
      } else {
        // No hay parámetros de URL, cargar normal
        await loadEntriesInitial();
      }
    };

    const loadEntriesInitial = async () => {
      setIsLoading(true);
      try {
        const response = await getEntries(1, filters, "");
        setEntries(response.results);
        setTotalItems(response.count);
        setTotalPages(Math.ceil(response.count / PAGE_SIZE));
      } catch (error) {
        console.error("Error al cargar las entradas:", error);
        showAlert("danger", "Error al cargar las entradas");
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeComponent();
  }, [isInitialized]); // Depende de isInitialized para evitar doble ejecución

  // Debounce para cambios manuales del usuario
  useEffect(() => {
    // No hacer nada si no está inicializado
    if (!isInitialized) return;

    // Para cambios manuales del usuario, aplicar debounce
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, isInitialized]);

  // Efecto para cargar datos cuando cambian los filtros o la búsqueda (solo para cambios manuales)
  useEffect(() => {
    // No ejecutar hasta que esté inicializado
    if (!isInitialized) return;

    // Verificar si hay parámetros de URL activos
    const entryId = searchParams.get("entry_id");
    const entryCode = searchParams.get("entry_code");
    if ((entryId || entryCode) && debouncedSearchTerm) {
      // Ya se cargó desde la URL, no hacer nada extra
      return;
    }

    setCurrentPage(1);
    loadEntries();
  }, [debouncedSearchTerm, filters]);

  // Efecto para la paginación
  useEffect(() => {
    if (!isInitialized) return;
    if (currentPage === 1) return; // Ya se cargó en el useEffect anterior
    loadEntries();
  }, [currentPage]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const response = await getEntries(
        currentPage,
        filters,
        debouncedSearchTerm
      );
      setEntries(response.results);
      setTotalItems(response.count);
      setTotalPages(Math.ceil(response.count / PAGE_SIZE));
    } catch (error) {
      console.error("Error al cargar las entradas:", error);
      showAlert("danger", "Error al cargar las entradas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowModal = (entry, mode) => {
    if (mode === "create") {
      setSelectedEntry({
        status: "pendiente",
        entry_products: [
          {
            product: null,
            quantity: 0,
            real_quantity: 0,
            batch: "",
            expiration_date: null,
          },
        ],
        entry_detail: {
          arrival_temperature: "",
          description: "",
          image: null,
        },
      });
    } else {
      setSelectedEntry(entry);
    }
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
  };

  const handleShowConfirmDelete = (entry) => {
    setSelectedEntry(entry);
    setShowConfirmModal(true);
  };

  const handleDeleteEntry = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(selectedEntry.id);
      await loadEntries();
      setShowConfirmModal(false);
      showAlert("success", "Entrada eliminada exitosamente");
    } catch (error) {
      showAlert("danger", "Error al eliminar la entrada");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShowCompleteModal = (entry) => {
    setEntryToComplete(entry);
    setShowCompleteModal(true);
  };

  const handleEntryCompleted = async (result) => {
    showAlert(
      "success",
      `Entrada ${result.entry?.code || ""} completada exitosamente`
    );
    await loadEntries();
  };

  const handleSaveEntry = async (entryData, productsToDelete = []) => {
    setIsSaving(true);
    try {
      let savedEntry;

      // Si la entrada está completada, enviar servicios + actualizar productos (sin eliminar)
      if (entryData.status === "completada" && entryData.id) {
        const serviciosData = {
          total_restibas: entryData.total_restibas,
          total_wraps: entryData.total_wraps,
          total_added_pallets: entryData.total_added_pallets,
        };
        await patchEntry(entryData.id, serviciosData);

        // Actualizar productos existentes (no eliminar ni crear)
        await Promise.all(
          entryData.entry_products
            .filter((product) => product.id) // Solo productos existentes
            .map(async (product) => {
              const productData = {
                entry_id: entryData.id,
                product_id: product.product?.id,
                quantity: product.quantity,
                real_quantity: product.real_quantity,
                batch: product.batch,
                expiration_date: product.expiration_date,
              };
              await updateEntryProduct(product.id, productData);
            })
        );

        // Recargar datos y cerrar modal
        await loadEntries();
        handleCloseModal();
        showAlert("success", "Entrada actualizada exitosamente");
        return;
      }

      // Crear o actualizar la entrada principal
      const entryBasicData = {
        client_id: entryData.client?.id,
        storage_id: entryData.storage?.id,
        status: entryData.status,
        condition: entryData.condition,
        in_type: entryData.in_type,
        entry_date: entryData.entry_date,
        total_restibas: entryData.total_restibas,
        total_wraps: entryData.total_wraps,
        total_added_pallets: entryData.total_added_pallets,
      };

      if (entryData.id) {
        savedEntry = await updateEntry(entryData.id, entryBasicData);
      } else {
        savedEntry = await createEntry(entryBasicData);
      }

      // Eliminar productos marcados para eliminación
      await Promise.all(
        productsToDelete.map((productId) => deleteEntryProduct(productId))
      );

      // Actualizar o crear productos
      await Promise.all(
        entryData.entry_products.map(async (product) => {
          const productData = {
            entry_id: savedEntry.id,
            product_id: product.product?.id,
            quantity: product.quantity,
            real_quantity: product.real_quantity,
            batch: product.batch,
            expiration_date: product.expiration_date,
          };

          if (product.id) {
            await updateEntryProduct(product.id, productData);
          } else {
            await createEntryProduct(productData);
          }
        })
      );

      // Manejar los detalles de la entrada y la imagen
      if (entryData.entry_detail) {
        const detailFormData = new FormData();
        detailFormData.append("entry_id", savedEntry.id);
        detailFormData.append(
          "arrival_temperature",
          entryData.entry_detail.arrival_temperature || ""
        );
        detailFormData.append(
          "description",
          entryData.entry_detail.description || ""
        );

        // Manejar la imagen
        if (entryData.entry_detail.delete_image) {
          detailFormData.append("delete_image", "true");
          detailFormData.append("image", ""); // Enviar imagen vacía
        } else if (entryData.entry_detail.image instanceof File) {
          detailFormData.append("image", entryData.entry_detail.image);
        }

        if (entryData.entry_detail.id) {
          await updateEntryDetail(entryData.entry_detail.id, detailFormData);
        } else {
          await createEntryDetail(detailFormData);
        }
      }

      // Recargar datos y cerrar modal
      await loadEntries();
      handleCloseModal();
      showAlert("success", "Entrada guardada exitosamente");
    } catch (error) {
      console.error("Error al guardar la entrada:", error);
      showAlert("danger", "Error al guardar la entrada");
    } finally {
      setIsSaving(false);
    }
  };

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  };

  const handleNewEntry = () => {
    handleShowModal(null, "create");
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (searchParams.toString()) {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilters(EMPTY_FILTERS);
    setSearchParams({});
  };

  const hasFilters = Boolean(searchTerm || filters.status || filters.condition);

  const toggleProductAccordion = (entryId) => {
    // Si el que vamos a abrir ya está abierto, simplemente lo cerramos
    if (expandedProducts[entryId]) {
      setExpandedProducts({
        ...expandedProducts,
        [entryId]: false,
      });
    } else {
      // Si vamos a abrir uno nuevo, cerramos todos y abrimos solo el seleccionado
      const resetExpanded = {};
      // Inicializar todos como cerrados
      entries.forEach((entry) => {
        resetExpanded[entry.id] = false;
      });
      // Abrir solo el seleccionado
      resetExpanded[entryId] = true;
      setExpandedProducts(resetExpanded);
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const result = await exportEntryOrdersToExcel(
        `Ordenes_Entrada_${new Date().toISOString().split("T")[0]}.xls`
      );
      if (result.success) {
        showAlert("success", "Archivo Excel exportado exitosamente");
      } else {
        showAlert("danger", "Error al exportar los datos");
      }
    } catch (error) {
      console.error("Error en la exportación:", error);
      showAlert("danger", "Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Órdenes de entrada"
        description="Gestiona las órdenes de ingreso al almacén."
        icon={PackageOpen}
        breadcrumbs={[
          { title: "Órdenes", active: true },
          { title: "Entradas", active: true },
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
                  id="search-entry"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (searchParams.toString()) {
                      setSearchParams({});
                    }
                  }}
                  onClear={() => {
                    setSearchTerm("");
                    setSearchParams({});
                  }}
                  placeholder="Buscar por código, cliente, bin o sku…"
                  className="!w-[300px] !min-w-[300px] !max-w-[300px] shrink-0"
                />
                <Form.Select
                  id="filter-status"
                  name="filter-status"
                  size="sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  aria-label="Filtrar por estado"
                  className="!w-[150px] shrink-0"
                  style={{ minWidth: "150px" }}
                >
                  <option value="">Estado</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select
                  id="filter-condition"
                  name="filter-condition"
                  size="sm"
                  value={filters.condition}
                  onChange={(e) => handleFilterChange("condition", e.target.value)}
                  aria-label="Filtrar por condición"
                  className="!w-[140px] shrink-0"
                  style={{ minWidth: "140px" }}
                >
                  <option value="">Condición</option>
                  {Object.entries(conditionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
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
                      onClick={handleNewEntry}
                    >
                      Nueva orden de entrada
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
              ) : entries.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[1040px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[140px] normal-case tracking-normal">
                        Código
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                        Cliente / Almacén
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[130px] normal-case tracking-normal">
                        Productos
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Estado
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Creación
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Entrada
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[140px] normal-case tracking-normal">
                        Acciones
                      </Table.HeaderCell>
                    </tr>
                  </Table.Head>
                  <Table.Body>
                    {entries.map((entry) => (
                      <Fragment key={entry.id}>
                        <Table.Row>
                          <Table.Cell className="whitespace-nowrap font-mono text-xs">
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 text-left transition-colors hover:text-sky-600 ${
                                expandedProducts[entry.id]
                                  ? "font-semibold text-sky-600"
                                  : "text-slate-600"
                              }`}
                              onClick={() => toggleProductAccordion(entry.id)}
                              aria-expanded={Boolean(expandedProducts[entry.id])}
                            >
                              {expandedProducts[entry.id] ? (
                                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                              )}
                              {entry.code}
                            </button>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="font-medium text-slate-900">
                              {entry.client?.name || "Sin cliente"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {entry.storage?.name || "Sin almacén"}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <WmsExpandItemsButton
                              count={entry.entry_products?.length || 0}
                              expanded={Boolean(expandedProducts[entry.id])}
                              onClick={() => toggleProductAccordion(entry.id)}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              variant={statusVariants[entry.status] || "secondary"}
                              dot={false}
                            >
                              {statusLabels[entry.status] || "Desconocido"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-slate-600">
                            {formatDate(entry.created_at)}
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-slate-600">
                            {entry.entry_date ? formatDate(entry.entry_date) : "Sin fecha"}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-1">
                              {entry.status === "completada" &&
                                entry.entry_detail?.pdf_document && (
                                  <Link
                                    href={entry.entry_detail.pdf_document}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Ver PDF"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Link>
                                )}
                              {perms.change &&
                                entry.status === "en_progreso" &&
                                entry.entry_products?.length > 0 &&
                                entry.entry_products.every((ep) => ep.is_completed) && (
                                  <IconButton
                                    size="sm"
                                    className="text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => handleShowCompleteModal(entry)}
                                    title="Completar entrada"
                                  >
                                    <Check className="h-4 w-4" />
                                  </IconButton>
                                )}
                              <IconButton
                                size="sm"
                                className="text-sky-600 hover:bg-sky-50"
                                onClick={() => handleShowModal(entry, "view")}
                                title="Ver entrada"
                              >
                                <Eye className="h-4 w-4" />
                              </IconButton>
                              {perms.change && (
                                <IconButton
                                  size="sm"
                                  className="text-violet-600 hover:bg-violet-50"
                                  onClick={() => handleShowModal(entry, "edit")}
                                  title="Editar entrada"
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconButton>
                              )}
                              {perms.delete && (
                                <IconButton
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleShowConfirmDelete(entry)}
                                  title="Eliminar entrada"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                        <AnimatePresence initial={false}>
                          {expandedProducts[entry.id] && (
                            <EntryExpandedProducts
                              key={`entry-expanded-${entry.id}`}
                              entry={entry}
                              expandedProducts={expandedProducts}
                              setExpandedProducts={setExpandedProducts}
                            />
                          )}
                        </AnimatePresence>
                      </Fragment>
                    ))}
                  </Table.Body>
                </Table>
              ) : (
                <EntriesEmptyState
                  hasFilters={hasFilters}
                  canCreate={perms.add}
                  onClearFilters={clearFilters}
                  onCreate={handleNewEntry}
                />
              )}
            </Card.Body>
            {entries.length > 0 && (
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
        showModal={showModal}
        handleCloseModal={handleCloseModal}
        modalMode={modalMode}
        selectedEntry={selectedEntry}
        setSelectedEntry={setSelectedEntry}
        isSaving={isSaving}
        handleSaveEntry={handleSaveEntry}
        statusLabels={statusLabels}
        conditionLabels={conditionLabels}
        inTypeLabels={inTypeLabels}
        showAlert={showAlert}
      />

      <ModalConfirm
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        isDeleting={isDeleting}
        handleDeleteEntry={handleDeleteEntry}
        selectedEntry={selectedEntry}
      />

      <ModalComplete
        show={showCompleteModal}
        onHide={() => {
          setShowCompleteModal(false);
          setEntryToComplete(null);
        }}
        entry={entryToComplete}
        onComplete={handleEntryCompleted}
      />
    </Fragment>
  );
};

export default Entries;
