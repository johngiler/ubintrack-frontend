"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Filter,
  FilterX,
  History,
  PackageOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";
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
import Select from "@/components/ui/Select";
import EntriesViewSkeleton from "./EntriesViewSkeleton";

import {
  getEntries,
  getEntry,
  getEntryIds,
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
  regenerateEntryPdf,
  exportEntryOrdersToExcel,
} from "@/services/orderService";

import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import AsyncProcessBanner from "@/components/wms/AsyncProcessBanner";
import {
  WmsExpandItemsButton,
} from "@/components/wms/WmsExpandItemsButton";
import EntriesEmptyState from "./components/EntriesEmptyState";
import EntryExpandedProducts from "./components/EntryExpandedProducts";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import ModalComplete from "./components/ModalComplete";
import ModalBulkRegenerate from "./components/ModalBulkRegenerate";
import ModalBulkDelete from "./components/ModalBulkDelete";
import SectionHistoryModal from "@/components/activity/SectionHistoryModal";
import { useViewHistory } from "@/hooks/useViewHistory";
import { useAsyncProcessTracker } from "@/hooks/useAsyncProcessTracker";
import { canCRUD, getApiErrorMessage } from "@/services/httpClient";
import { formatDate, formatDocumentCode } from "@/lib/format";

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
  const {
    historyOpen,
    historyType,
    historyActor,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [initialTab, setInitialTab] = useState("details");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("entry_code") || ""
  );
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [urlResolved, setUrlResolved] = useState(false);
  const [ready, setReady] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [entryToComplete, setEntryToComplete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [showBulkRegenerateModal, setShowBulkRegenerateModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const PAGE_SIZE = 20;

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);

  // Init desde URL: solo fija la búsqueda (entry_code ya viene en el estado inicial)
  useEffect(() => {
    let cancelled = false;

    const initFromUrl = async () => {
      const entryId = searchParams.get("entry_id");
      if (entryId && !searchParams.get("entry_code")) {
        try {
          const entry = await getEntry(entryId);
          if (!cancelled && entry?.code) setSearchTerm(entry.code);
        } catch (error) {
          console.error("Error al resolver la entrada:", error);
        }
      }
      if (!cancelled) setUrlResolved(true);
    };

    initFromUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listo cuando la URL se resolvió y el debounce ya refleja la búsqueda (evita doble fetch)
  useEffect(() => {
    if (urlResolved && !ready && debouncedSearchTerm === searchTerm) {
      setReady(true);
    }
  }, [urlResolved, ready, debouncedSearchTerm, searchTerm]);

  useEffect(() => {
    if (ready) setCurrentPage(1);
  }, [debouncedSearchTerm, filters, ready]);

  const {
    results: entries,
    count: totalItems,
    totalPages,
    isLoading: isListLoading,
    error: listError,
    mutate: loadEntries,
  } = usePaginatedList({
    key: ready
      ? swrKeys.entries(currentPage, debouncedSearchTerm, filters)
      : null,
    fetcher: () => getEntries(currentPage, filters, debouncedSearchTerm),
    pageSize: PAGE_SIZE,
  });
  const isLoading = isListLoading || !ready;

  const showAlert = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 4000);
  }, []);

  const asyncProcess = useAsyncProcessTracker("entries", {
    onSettled: ({ failed, message }) => {
      showAlert(failed ? "danger" : "success", message);
      if (!failed) {
        setSelectedIds([]);
        void loadEntries();
      }
    },
  });

  useEffect(() => {
    if (listError) {
      console.error("Error al cargar las entradas:", listError);
      showAlert("danger", "Error al cargar las entradas");
    }
  }, [listError, showAlert]);

  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearchTerm, filters.status, filters.condition, currentPage]);

  const handleShowModal = (entry, mode, tab = "details") => {
    if (mode === "create") {
      setSelectedEntry({
        status: "pendiente",
        entry_products: [
          {
            product: null,
            quantity: 0,
            real_quantity: 0,
            batch: "",
            production_date: null,
            expiration_date: null,
          },
        ],
        entry_detail: {
          arrival_temperature: "",
          description: "",
          include_images_in_pdf: false,
          extra_fields: [],
          images: [],
          new_images: [],
          delete_image_ids: [],
        },
      });
    } else {
      const detail = entry?.entry_detail || {};
      setSelectedEntry({
        ...entry,
        entry_detail: {
          ...detail,
          include_images_in_pdf: Boolean(detail.include_images_in_pdf),
          extra_fields: Array.isArray(detail.extra_fields)
            ? detail.extra_fields
            : [],
          images: Array.isArray(detail.images) ? detail.images : [],
          new_images: [],
          delete_image_ids: [],
        },
      });
    }
    setModalMode(mode);
    setInitialTab(tab);
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

  const saveEntryDetail = async (entryId, detail) => {
    if (!entryId || !detail) return;
    const formData = new FormData();
    formData.append("entry_id", entryId);

    const temp = detail.arrival_temperature;
    if (temp === "" || temp == null) {
      formData.append("arrival_temperature", "");
    } else {
      formData.append("arrival_temperature", String(temp));
    }
    formData.append("description", detail.description || "");
    formData.append(
      "include_images_in_pdf",
      detail.include_images_in_pdf ? "true" : "false",
    );

    const extras = (Array.isArray(detail.extra_fields) ? detail.extra_fields : [])
      .filter((row) => String(row?.name || "").trim())
      .map((row) => {
        const type = row.type || "normal";
        let value = row.value ?? "";
        if (type === "check") {
          value = Boolean(value);
        } else if (type === "normal") {
          value = String(value).slice(0, 60);
        } else if (type === "texto") {
          value = String(value).split("\n").slice(0, 6).join("\n");
        }
        return {
          name: String(row.name).trim(),
          type,
          value,
        };
      });
    formData.append("extra_fields", JSON.stringify(extras));

    const deleteIds = Array.isArray(detail.delete_image_ids)
      ? detail.delete_image_ids
      : [];
    if (deleteIds.length) {
      formData.append("delete_image_ids", deleteIds.join(","));
    }

    const newImages = Array.isArray(detail.new_images) ? detail.new_images : [];
    newImages.forEach((file) => {
      if (file instanceof File) {
        formData.append("images", file);
      }
    });

    if (detail.id) {
      await updateEntryDetail(detail.id, formData);
    } else {
      await createEntryDetail(formData);
    }
  };

  const handleSaveEntry = async (entryData, productsToDelete = []) => {
    setIsSaving(true);
    try {
      let savedEntry;

      // Si la entrada está completada: servicios + flags + detalle + productos
      if (entryData.status === "completada" && entryData.id) {
        const serviciosData = {
          total_restibas: entryData.total_restibas,
          total_wraps: entryData.total_wraps,
          total_added_pallets: entryData.total_added_pallets,
          condition: entryData.condition,
          in_type: entryData.in_type,
        };
        await patchEntry(entryData.id, serviciosData);

        await Promise.all(
          entryData.entry_products
            .filter((product) => product.id)
            .map(async (product) => {
              const productData = {
                entry_id: entryData.id,
                product_id: product.product?.id,
                quantity: product.quantity,
                real_quantity: product.real_quantity,
                batch: product.batch,
                production_date: product.production_date || null,
                expiration_date: product.expiration_date,
              };
              await updateEntryProduct(product.id, productData);
            })
        );

        await saveEntryDetail(entryData.id, entryData.entry_detail);

        try {
          await regenerateEntryPdf(entryData.id);
        } catch {
          /* flags/detalle ya guardados; el PDF se puede regenerar luego */
        }

        await loadEntries();
        handleCloseModal();
        showAlert("success", "Entrada actualizada exitosamente");
        return;
      }

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

      await Promise.all(
        productsToDelete.map((productId) => deleteEntryProduct(productId))
      );

      await Promise.all(
        entryData.entry_products.map(async (product) => {
          const productData = {
            entry_id: savedEntry.id,
            product_id: product.product?.id,
            quantity: product.quantity,
            real_quantity: product.real_quantity,
            batch: product.batch,
            production_date: product.production_date || null,
            expiration_date: product.expiration_date,
          };

          if (product.id) {
            await updateEntryProduct(product.id, productData);
          } else {
            await createEntryProduct(productData);
          }
        })
      );

      await saveEntryDetail(savedEntry.id, entryData.entry_detail);

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

  const handleNewEntry = () => {
    handleShowModal(null, "create");
  };

  const visibleIds = useMemo(() => entries.map((row) => row.id), [entries]);
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectedIds.length;
  const showBulkActions = selectedCount > 0;
  const showSelection = Boolean(perms.change || perms.delete);
  const selectedEntriesKnown = useMemo(
    () => entries.filter((row) => selectedIds.includes(row.id)),
    [entries, selectedIds],
  );
  const canBulkDeleteKnown = selectedEntriesKnown.every(
    (row) =>
      row.status !== "completada" && !(Number(row.bins_count) > 0),
  );
  const showSelectAllFiltered =
    allVisibleSelected &&
    Boolean(totalItems) &&
    totalItems > visibleIds.length &&
    selectedCount < totalItems;

  const toggleEntrySelection = (entryId) => {
    setSelectedIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId],
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
      const data = await getEntryIds(filters, debouncedSearchTerm);
      setSelectedIds(Array.isArray(data?.ids) ? data.ids : []);
      if (data?.truncated) {
        showAlert(
          "warning",
          data.detail || `Se seleccionaron ${data.count} de ${data.total}.`,
        );
      }
    } catch (error) {
      showAlert(
        "danger",
        getApiErrorMessage(error, "No se pudieron seleccionar todos"),
      );
    } finally {
      setIsSelectingAll(false);
    }
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
    setFilters(EMPTY_FILTERS);
    setSearchParams({});
    setSelectedIds([]);
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
      const result = await exportEntryOrdersToExcel({
        filters,
        search: debouncedSearchTerm,
        filename: `Ordenes_Entrada_${new Date().toISOString().split("T")[0]}.xls`,
      });
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
      <AsyncProcessBanner jobs={asyncProcess.jobs} />
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
              <div className="flex w-full flex-col gap-2">
              <div className="flex w-full flex-wrap items-center gap-2">
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
                  className="w-full min-w-0 max-w-full sm:!w-[280px] sm:!min-w-[220px] sm:!max-w-full shrink-0"
                />
                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                {hasFilters && (
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
                  variant={filtersOpen || hasFilters ? "secondary" : "outline"}
                  size="sm"
                  icon={Filter}
                  onClick={() => setFiltersOpen((o) => !o)}
                  title={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
                  className="whitespace-nowrap"
                  aria-expanded={filtersOpen}
                >
                  Filtros{hasFilters ? ` (${Object.values(filters).filter(Boolean).length})` : ""}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={History}
                  onClick={openHistory}
                  title="Historial de movimientos"
                  className="whitespace-nowrap"
                >
                  Historial
                </Button>
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
              <AnimatePresence initial={false}>
                {filtersOpen ? (
                  <motion.div
                    key="entry-filters"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2">
                      <Form.Group className="mb-0">
                        <Form.Label className="text-xs">Estado</Form.Label>
                        <Select
                          size="sm"
                          isClearable
                          options={Object.entries(statusLabels).map(([value, label]) => ({
                            value,
                            label,
                          }))}
                          value={filters.status}
                          onChange={(e) =>
                            handleFilterChange("status", e.target.value || "")
                          }
                        />
                      </Form.Group>
                      <Form.Group className="mb-0">
                        <Form.Label className="text-xs">Condición</Form.Label>
                        <Select
                          size="sm"
                          isClearable
                          options={Object.entries(conditionLabels).map(([value, label]) => ({
                            value,
                            label,
                          }))}
                          value={filters.condition}
                          onChange={(e) =>
                            handleFilterChange("condition", e.target.value || "")
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
                  {perms.change ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={FileText}
                      onClick={() => setShowBulkRegenerateModal(true)}
                      title="Regenerar pdfs seleccionados"
                      className="shrink-0 whitespace-nowrap"
                      disabled={asyncProcess.hasKind("entry_regenerate_pdfs")}
                    >
                      Regenerar pdfs
                    </Button>
                  ) : null}
                  {perms.delete ? (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setShowBulkDeleteModal(true)}
                      title="Eliminar entradas seleccionadas"
                      className="shrink-0 whitespace-nowrap"
                      disabled={asyncProcess.hasKind("entry_delete")}
                    >
                      Eliminar
                    </Button>
                  ) : null}
                  {showSelectAllFiltered ? (
                    <button
                      type="button"
                      className="cursor-pointer text-xs font-medium text-sky-700 hover:underline disabled:opacity-50"
                      onClick={handleSelectAllFiltered}
                      disabled={isSelectingAll}
                    >
                      {isSelectingAll
                        ? "Seleccionando…"
                        : `Seleccionar todos los filtrados (${totalItems})`}
                    </button>
                  ) : null}
                </div>
              ) : null}
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {isLoading ? (
                <EntriesViewSkeleton showSelection={showSelection} />
              ) : entries.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[1040px]">
                  <Table.Head>
                    <tr>
                      {showSelection ? (
                        <Table.HeaderCell className="w-10 normal-case tracking-normal">
                          <Form.Check
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAllVisible}
                            aria-label="Seleccionar todas las visibles"
                          />
                        </Table.HeaderCell>
                      ) : null}
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
                          {showSelection ? (
                            <Table.Cell>
                              <Form.Check
                                type="checkbox"
                                checked={selectedIds.includes(entry.id)}
                                onChange={() => toggleEntrySelection(entry.id)}
                                aria-label={`Seleccionar ${entry.code}`}
                              />
                            </Table.Cell>
                          ) : null}
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
                              {formatDocumentCode(entry.code)}
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
                                className="text-amber-600 hover:bg-amber-50"
                                onClick={() =>
                                  handleShowModal(entry, "view", "movements")
                                }
                                title="Ver historial"
                              >
                                <History className="h-4 w-4" />
                              </IconButton>
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
                              showSelection={showSelection}
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
        initialTab={initialTab}
      />

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="entry"
        title="Historial de movimientos de entradas"
        initialAction={historyType}
        initialActor={historyActor}
        initialBatchId={historyBatch}
        onOpenItem={async (item) => {
          if (!item?.resource_id) return;
          try {
            const entry = await getEntry(item.resource_id);
            handleShowModal(entry, "view", "movements");
          } catch (err) {
            showAlert(
              "danger",
              getApiErrorMessage(err, "No se pudo abrir la entrada."),
            );
          }
        }}
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

      <ModalBulkRegenerate
        show={showBulkRegenerateModal}
        onHide={() => setShowBulkRegenerateModal(false)}
        entryIds={selectedIds}
        showAlert={showAlert}
        trackAsyncJob={asyncProcess}
        onDone={async () => {
          setSelectedIds([]);
          await loadEntries();
        }}
      />

      <ModalBulkDelete
        show={showBulkDeleteModal}
        onHide={() => setShowBulkDeleteModal(false)}
        entryIds={selectedIds}
        canDeleteAll={
          selectedEntriesKnown.length === selectedIds.length
            ? canBulkDeleteKnown
            : true
        }
        showAlert={showAlert}
        trackAsyncJob={asyncProcess}
        onDone={async () => {
          setSelectedIds([]);
          await loadEntries();
        }}
      />
    </Fragment>
  );
};

export default Entries;
