"use client";

import { Fragment, useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  Boxes,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FilterX,
  History,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";
import { useWmsNavigate, useWmsSearchParams } from "@/hooks/useWmsRouter";

import {
  Card,
  Col,
  Row,
  Button,
  Alert,
  Pagination,
  Form,
  Table,
  Modal,
} from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { ConditionBadge } from "@/views/CavasView/cavaLabels";

import {
  getBins,
  deleteBin,
  createBin,
  updateBin,
  deleteBinProduct,
  updateBinProduct,
  createBinProduct,
  printBinTag,
  exportBinsToExcel,
  almacenarBinsMasivo,
  getCriteriosAlmacenamiento,
} from "@/services/inventoryService";
import { canCRUD, getApiErrorMessage } from "@/services/httpClient";

import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import {
  WmsExpandItemsButton,
  WmsExpandItemsEmpty,
} from "@/components/wms/WmsExpandItemsButton";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import ModalQRValidation from "./components/ModalQRValidation";
import BinExpandedProducts from "./components/BinExpandedProducts";
import { formatDate } from "@/lib/format";
import { statusBadgeVariant, statusLabels } from "./binLabels";

const BinsView = () => {
  const user = useAuth().user;
  const perms = canCRUD(user, "inventory", "bin");
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const navigate = useWmsNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("bin_code") || ""
  );
  const [filters, setFilters] = useState({ status: "", is_active: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [printingBinId, setPrintingBinId] = useState(null);
  const [errorResponse, setErrorResponse] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isAlmacenando, setIsAlmacenando] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Estados para el modal QR
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedBinForQR, setSelectedBinForQR] = useState(null);

  // Estado para modal de confirmación de almacenar masivo
  const [showAlmacenarModal, setShowAlmacenarModal] = useState(false);
  const [selectedBinIds, setSelectedBinIds] = useState([]);
  const [massStorePreview, setMassStorePreview] = useState([]);
  const [massStoreStep, setMassStoreStep] = useState("idle"); // idle | calculating | preview | applying
  const [massStoreStrategy, setMassStoreStrategy] = useState("");
  const [massStoreCriteria, setMassStoreCriteria] = useState([]);
  const [massStoreError, setMassStoreError] = useState(null);


  // Estado para la pestaña inicial del modal
  const [initialTab, setInitialTab] = useState("details");

  const PAGE_SIZE = 20;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);

  // bin_code de la URL ya viene en el estado inicial de searchTerm (sin fetch aparte)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters]);

  const {
    results: entries,
    count: totalItems,
    totalPages,
    isLoading,
    error: listError,
    mutate: loadEntries,
  } = usePaginatedList({
    key: swrKeys.bins(currentPage, debouncedSearchTerm, filters),
    fetcher: () => getBins(currentPage, filters, debouncedSearchTerm),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (listError) {
      console.error("Error al cargar los bins:", listError);
      showAlert("danger", "Error al cargar los bins");
    }
  }, [listError]);

  const handleShowModal = (entry, mode, tab = "details") => {
    if (mode === "create") {
      setSelectedEntry({
        status: "en_recibo",
        is_active: true,
        bin_products: [
          {
            product: null,
            quantity: 0,
          },
        ],
      });
    } else {
      setSelectedEntry(entry);
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
      await deleteBin(selectedEntry.id);
      await loadEntries();
      setShowConfirmModal(false);
      showAlert("success", "Bin eliminado exitosamente");
    } catch (error) {
      console.error("Error al eliminar el bin:", error);
      showAlert("danger", "Error al eliminar el bin");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEntry = async (entryData, productsToDelete = []) => {
    setIsSaving(true);
    setErrorResponse(null);

    try {
      let savedBin;

      if (!entryData.entry) {
        throw new Error("La orden de entrada es requerida");
      }

      const binData = {
        entry_id: entryData.entry.value,
        position_id: entryData.position?.value || null,
        status: entryData.status,
        client_id: entryData.client?.id || entryData.entry.client?.id,
        is_active: entryData.is_active !== false,
      };

      if (entryData.id) {
        savedBin = await updateBin(entryData.id, binData);
      } else {
        savedBin = await createBin(binData);
      }

      await Promise.all(
        productsToDelete.map((productId) => deleteBinProduct(productId))
      );

      let hasError = false;

      await Promise.allSettled(
        entryData.bin_products.map(async (product) => {
          if (!product.product) {
            console.warn("Se intentó guardar un producto sin seleccionar");
            return;
          }

          const productData = {
            bin_id: savedBin.id,
            entry_product_id: product.product.value,
            quantity: product.quantity,
            batch: product.batch,
            expiration_date: product.expiration_date || null,
          };

          try {
            if (product.id) {
              return await updateBinProduct(product.id, productData);
            } else {
              return await createBinProduct(productData);
            }
          } catch (error) {
            if (error.response && error.response.data) {
              setErrorResponse(error.response.data);
              hasError = true;
            }
          }
        })
      );

      if (!hasError) {
        await loadEntries();
        handleCloseModal();
        showAlert("success", "Bin guardado exitosamente");
      }
    } catch (error) {
      console.error("Error al guardar el bin:", error);
      showAlert("danger", `Error al guardar el bin: ${error.message}`);
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
  };

  const handlePrintTag = async (binId) => {
    if (printingBinId) return;

    setPrintingBinId(binId);
    try {
      await printBinTag(binId);
      showAlert("success", "Etiqueta enviada a impresión");
    } catch (error) {
      console.error("Error al imprimir etiqueta:", error);
      showAlert("danger", "Error al imprimir la etiqueta");
    } finally {
      setPrintingBinId(null);
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const result = await exportBinsToExcel({
        filters,
        search: debouncedSearchTerm,
        filename: `Bins_${new Date().toISOString().split("T")[0]}.xls`,
      });

      if (result.success) {
        showAlert("success", "Archivo Excel descargado correctamente");
      } else {
        showAlert("danger", "Error al descargar el archivo Excel");
      }
    } catch (error) {
      console.error("Error en la exportación:", error);
      showAlert("danger", "Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  };

  // Almacenamiento masivo: abrir modal → elegir criterio → sugerir → confirmar
  const loadMassStorePreview = async (strategy) => {
    if (selectedBinIds.length === 0 || !strategy) return;

    setIsAlmacenando(true);
    setMassStoreStep("calculating");
    setMassStoreError(null);
    try {
      const result = await almacenarBinsMasivo({
        binIds: selectedBinIds,
        strategy,
        confirm: false,
      });

      if (result.success) {
        setMassStorePreview(result.assignments || []);
        setMassStoreStep("preview");
      } else {
        setMassStorePreview([]);
        setMassStoreError(result.message || "No se pudo sugerir posiciones");
        setMassStoreStep("preview");
      }
    } catch (error) {
      console.error("Error al sugerir almacenamiento:", error);
      setMassStorePreview([]);
      setMassStoreError(getApiErrorMessage(error, "Error al sugerir posiciones"));
      setMassStoreStep("preview");
    } finally {
      setIsAlmacenando(false);
    }
  };

  const openAlmacenarMasivo = async () => {
    if (isAlmacenando || selectedBinIds.length === 0) return;

    setMassStoreError(null);
    setMassStorePreview([]);
    setMassStoreStrategy("");
    setMassStoreStep("idle");
    setShowAlmacenarModal(true);

    try {
      const criteria = await getCriteriosAlmacenamiento();
      const list = Array.isArray(criteria) ? criteria : [];
      setMassStoreCriteria(list);
    } catch (error) {
      console.error("Error al cargar criterios:", error);
      setMassStoreCriteria([
        { id: "push", label: "Push (conducto)", description: "" },
        {
          id: "compact_sku_batch",
          label: "Compactar SKU y lote",
          description: "",
        },
      ]);
    }
  };

  const handleMassStoreStrategyChange = async (nextStrategy) => {
    const strategy = String(nextStrategy || "").trim();
    setMassStoreStrategy(strategy);
    setMassStorePreview([]);
    setMassStoreError(null);
    if (!strategy) {
      setMassStoreStep("idle");
      return;
    }
    await loadMassStorePreview(strategy);
  };

  const handleAlmacenarMasivo = async () => {
    if (isAlmacenando || selectedBinIds.length === 0 || !massStoreStrategy) return;

    setIsAlmacenando(true);
    setMassStoreStep("applying");
    setMassStoreError(null);
    try {
      const result = await almacenarBinsMasivo({
        binIds: selectedBinIds,
        strategy: massStoreStrategy,
        confirm: true,
        assignments: massStorePreview,
      });

      if (result.success) {
        showAlert(
          "success",
          result.message || `${result.updated} bins almacenados`
        );
        setShowAlmacenarModal(false);
        setMassStorePreview([]);
        setMassStoreStrategy("");
        setMassStoreStep("idle");
        setMassStoreError(null);
        setSelectedBinIds([]);
        loadEntries();
      } else {
        setMassStoreError(result.message || "Error al almacenar los bins");
        setMassStoreStep("preview");
      }
    } catch (error) {
      console.error("Error al almacenar masivamente:", error);
      setMassStoreError(getApiErrorMessage(error, "Error al almacenar los bins"));
      setMassStoreStep("preview");
    } finally {
      setIsAlmacenando(false);
    }
  };

  const toggleBinSelection = (binId) => {
    const bin = entries.find((e) => e.id === binId);
    if (bin?.position) return;
    setSelectedBinIds((prev) =>
      prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
    );
  };

  const toggleSelectAllVisible = () => {
    const selectableIds = entries
      .filter((e) => !e.position)
      .map((e) => e.id);
    if (selectableIds.length === 0) return;
    const allSelected = selectableIds.every((id) => selectedBinIds.includes(id));
    if (allSelected) {
      setSelectedBinIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      setSelectedBinIds((prev) => [...new Set([...prev, ...selectableIds])]);
    }
  };

  const toggleProductGroup = (entryId) => {
    setExpandedGroups((prev) => {
      // Si ya está abierto, lo cerramos
      if (prev[entryId]) {
        const newState = { ...prev };
        delete newState[entryId];
        return newState;
      } else {
        // Si está cerrado, cerramos todos los demás antes de abrir este
        const newState = {};
        newState[entryId] = true;
        return newState;
      }
    });
  };

  // Funciones para el modal QR
  const handleShowQRModal = (entry) => {
    setSelectedBinForQR(entry);
    setShowQRModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedBinForQR(null);
  };

  const handleQRProcessSuccess = async () => {
    await loadEntries();
    showAlert("success", "Bin almacenado exitosamente");
  };

  const hasFilters = Boolean(searchTerm || filters.status || filters.is_active !== "");

  const binCanApplyCriterion = (bin) => Boolean(bin && !bin.position);

  const selectableVisibleIds = entries
    .filter(binCanApplyCriterion)
    .map((e) => e.id);
  const showCriterionSelection = perms.change && selectableVisibleIds.length > 0;

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({ status: "", is_active: "" });
    setSearchParams({});
  };

  const getBinConditions = (entry) =>
    [...new Set(
      (entry.bin_products || [])
        .map((bep) => bep.entry_product?.product?.condition)
        .filter(Boolean),
    )];

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Bins"
        description="Gestiona los bins de inventario en el almacén."
        icon={Boxes}
        breadcrumbs={[
          { title: "Inventario", active: true },
          { title: "Bins", active: true },
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
                  id="search-bin"
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
                  placeholder="Buscar por código de bin, entrada o sku…"
                  className="!w-[280px] !min-w-[280px] !max-w-[280px] shrink-0"
                />
                <Form.Select
                  id="status-filter"
                  name="status-filter"
                  size="sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  aria-label="Filtrar por estado"
                  className="!w-[160px] shrink-0"
                  style={{ minWidth: "160px" }}
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select
                  id="is-active-filter"
                  size="sm"
                  value={filters.is_active}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((f) => ({
                      ...f,
                      is_active: val === "" ? "" : val === "true",
                    }));
                    setCurrentPage(1);
                  }}
                  aria-label="Filtrar por activo"
                  className="!w-[150px] shrink-0"
                  style={{ minWidth: "150px" }}
                >
                  <option value="">Activo/Inactivo</option>
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
                {perms.change && selectedBinIds.length > 0 && (
                  <Button
                    variant="success"
                    size="sm"
                    icon={Archive}
                    onClick={openAlmacenarMasivo}
                    disabled={isAlmacenando}
                    loading={isAlmacenando && !showAlmacenarModal}
                    title="Aplicar criterio de almacenamiento para los bins seleccionados"
                    className="shrink-0 whitespace-nowrap"
                  >
                    {isAlmacenando && !showAlmacenarModal
                      ? "Procesando…"
                      : `Aplicar criterio (${selectedBinIds.length})`}
                  </Button>
                )}
                <div className="ml-auto shrink-0 pl-2">
                  {perms.add && !user?.client && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      className="whitespace-nowrap"
                      onClick={handleNewEntry}
                    >
                      Nuevo bin
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
                <Table hover responsive className="mb-0 min-w-[980px]">
                  <Table.Head>
                    <tr>
                      {showCriterionSelection && (
                        <Table.HeaderCell className="w-10 normal-case tracking-normal">
                          <Form.Check
                            type="checkbox"
                            checked={
                              selectableVisibleIds.length > 0 &&
                              selectableVisibleIds.every((id) =>
                                selectedBinIds.includes(id)
                              )
                            }
                            onChange={toggleSelectAllVisible}
                            aria-label="Seleccionar todos sin posición"
                          />
                        </Table.HeaderCell>
                      )}
                      <Table.HeaderCell className="min-w-[130px] normal-case tracking-normal">
                        Código
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[220px] normal-case tracking-normal">
                        Entrada / Cliente
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[130px] normal-case tracking-normal">
                        Productos
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Condición
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[130px] normal-case tracking-normal">
                        Posición
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Estado
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[150px] normal-case tracking-normal">
                        Acciones
                      </Table.HeaderCell>
                    </tr>
                  </Table.Head>
                  <Table.Body>
                    {entries.map((entry) => {
                      const isExpanded = Boolean(expandedGroups[entry.id]);
                      const conditions = getBinConditions(entry);
                      const canSelectForCriterion = binCanApplyCriterion(entry);

                      return (
                        <Fragment key={entry.id}>
                          <Table.Row>
                            {showCriterionSelection && (
                              <Table.Cell>
                                {canSelectForCriterion ? (
                                  <Form.Check
                                    type="checkbox"
                                    checked={selectedBinIds.includes(entry.id)}
                                    onChange={() => toggleBinSelection(entry.id)}
                                    aria-label={`Seleccionar ${entry.code}`}
                                  />
                                ) : null}
                              </Table.Cell>
                            )}
                            <Table.Cell>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-sky-700"
                                onClick={() => toggleProductGroup(entry.id)}
                              >
                                {entry.is_active === false && (
                                  <XCircle className="h-4 w-4 shrink-0 text-red-500" title="Bin inactivo" />
                                )}
                                {entry.code}
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </button>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex max-w-[220px] flex-col">
                                {entry.entry?.code ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 truncate text-left text-sm font-medium text-sky-600 hover:underline"
                                    title={`Ver orden de entrada: ${entry.entry.code}`}
                                    onClick={() =>
                                      navigate(
                                        `/order/entries?entry_code=${encodeURIComponent(entry.entry.code)}`,
                                      )
                                    }
                                  >
                                    {entry.entry.code}
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  </button>
                                ) : (
                                  <span className="text-sm text-slate-400">Sin orden</span>
                                )}
                                <span className="truncate text-xs text-slate-500">
                                  {entry.client?.name || "—"}
                                </span>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              {entry.bin_products?.length > 0 ? (
                                <WmsExpandItemsButton
                                  count={entry.bin_products.length}
                                  expanded={isExpanded}
                                  onClick={() => toggleProductGroup(entry.id)}
                                />
                              ) : (
                                <WmsExpandItemsEmpty />
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {conditions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {conditions.map((condition) => (
                                    <ConditionBadge key={condition} condition={condition} />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {entry.position?.code ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200/80 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/25 dark:hover:bg-sky-500/25"
                                  onClick={() =>
                                    navigate(
                                      `/storage/positions?search=${encodeURIComponent(entry.position.code)}`,
                                    )
                                  }
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                  {entry.position.code}
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-col items-start gap-1">
                                <Badge variant={statusBadgeVariant[entry.status] || "default"} dot={false}>
                                  {statusLabels[entry.status] || entry.status}
                                </Badge>
                                {entry.dispatched_date && (
                                  <span className="text-xs text-slate-500">
                                    el {formatDate(entry.dispatched_date)}
                                  </span>
                                )}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-1">
                                {!user?.client && (
                                  <IconButton
                                    size="sm"
                                    className="text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => handlePrintTag(entry.id)}
                                    disabled={printingBinId === entry.id}
                                    title="Imprimir etiqueta"
                                  >
                                    {printingBinId === entry.id ? (
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                      <Printer className="h-4 w-4" />
                                    )}
                                  </IconButton>
                                )}
                                <IconButton
                                  size="sm"
                                  className="text-amber-600 hover:bg-amber-50"
                                  onClick={() => handleShowModal(entry, "view", "movements")}
                                  title="Ver historial"
                                >
                                  <History className="h-4 w-4" />
                                </IconButton>
                                <IconButton
                                  size="sm"
                                  className="text-sky-600 hover:bg-sky-50"
                                  onClick={() => handleShowModal(entry, "view")}
                                  title="Ver detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </IconButton>
                                {perms.change && (
                                  <IconButton
                                    size="sm"
                                    className="text-violet-600 hover:bg-violet-50"
                                    onClick={() => handleShowModal(entry, "edit")}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </IconButton>
                                )}
                                {perms.delete && (
                                  <IconButton
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleShowConfirmDelete(entry)}
                                    title="Eliminar"
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
                                key={`expanded-${entry.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <td colSpan={showCriterionSelection ? 8 : 7} className="p-0">
                                  <BinExpandedProducts
                                    entry={entry}
                                    user={user}
                                    navigate={navigate}
                                    onStoreBin={handleShowQRModal}
                                  />
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
                  canCreate={perms.add && !user?.client}
                  onClearFilters={clearFilters}
                  onCreate={handleNewEntry}
                  emptyTitle="No hay bins registrados"
                  emptyDescription="Comienza creando tu primer bin."
                  filtersTitle="No se encontraron bins"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros."
                  createLabel="Nuevo bin"
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
        showModal={showModal}
        handleCloseModal={handleCloseModal}
        modalMode={modalMode}
        selectedEntry={selectedEntry}
        setSelectedEntry={setSelectedEntry}
        isSaving={isSaving}
        handleSaveEntry={handleSaveEntry}
        statusLabels={statusLabels}
        errorResponse={errorResponse}
        initialTab={initialTab}
      />

      <ModalConfirm
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        isDeleting={isDeleting}
        handleDeleteEntry={handleDeleteEntry}
        selectedEntry={selectedEntry}
      />

      <ModalQRValidation
        showModal={showQRModal}
        handleCloseModal={handleCloseQRModal}
        selectedBin={selectedBinForQR}
        onProcessSuccess={handleQRProcessSuccess}
      />

      <Modal show={showAlmacenarModal} onHide={() => {
        if (isAlmacenando) return;
        setShowAlmacenarModal(false);
        setMassStorePreview([]);
        setMassStoreStrategy("");
        setMassStoreStep("idle");
        setMassStoreError(null);
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-emerald-600" />
            Aplicar criterio
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {massStoreError ? (
            <Alert
              variant="danger"
              dismissible
              onClose={() => setMassStoreError(null)}
              className="mb-3"
            >
              {massStoreError}
            </Alert>
          ) : null}

          <Form.Group className="mb-3">
            <Form.Label>Criterio de almacenamiento</Form.Label>
            <Select
              inputId="mass-store-strategy"
              size="sm"
              value={massStoreStrategy}
              isClearable
              isDisabled={isAlmacenando}
              placeholder="Seleccione un criterio"
              options={(massStoreCriteria.length
                ? massStoreCriteria
                : [
                    { id: "push", label: "Push (conducto)" },
                    { id: "compact_sku_batch", label: "Compactar SKU y lote" },
                  ]
              ).map((c) => ({
                value: c.id,
                label: c.label,
              }))}
              onChange={(e) => handleMassStoreStrategyChange(e.target.value)}
            />
            {massStoreStrategy &&
            massStoreCriteria.find((c) => c.id === massStoreStrategy)?.description ? (
              <Form.Text className="text-muted">
                {
                  massStoreCriteria.find((c) => c.id === massStoreStrategy)
                    .description
                }
              </Form.Text>
            ) : null}
          </Form.Group>

          {massStoreStep === "calculating" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
                role="status"
                aria-label="Calculando"
              />
              <p className="mb-0 text-sm text-slate-500">Calculando posiciones…</p>
            </div>
          ) : massStorePreview.length > 0 ? (
            <div className="max-h-72 overflow-y-auto rounded border border-[var(--border-subtle)]">
              <Table hover responsive className="mb-0">
                <Table.Head>
                  <tr>
                    <Table.HeaderCell className="normal-case">Bin</Table.HeaderCell>
                    <Table.HeaderCell className="normal-case">Posición</Table.HeaderCell>
                  </tr>
                </Table.Head>
                <Table.Body>
                  {massStorePreview.map((row) => (
                    <Table.Row key={`${row.bin_id}-${row.position_id}`}>
                      <Table.Cell>{row.bin_code}</Table.Cell>
                      <Table.Cell>{row.position_code}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          ) : massStoreStrategy ? (
            <p className="mb-0 text-sm text-slate-500">Sin sugerencias.</p>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={XCircle}
            onClick={() => {
              setShowAlmacenarModal(false);
              setMassStorePreview([]);
              setMassStoreStrategy("");
              setMassStoreStep("idle");
              setMassStoreError(null);
            }}
            disabled={isAlmacenando}
          >
            Cancelar
          </Button>
          <Button
            variant="success"
            icon={Archive}
            onClick={handleAlmacenarMasivo}
            disabled={
              isAlmacenando ||
              !massStoreStrategy ||
              massStorePreview.length === 0
            }
            loading={isAlmacenando && massStoreStep === "applying"}
          >
            {isAlmacenando && massStoreStep === "applying"
              ? "Almacenando…"
              : `Confirmar (${massStorePreview.length})`}
          </Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default BinsView;
