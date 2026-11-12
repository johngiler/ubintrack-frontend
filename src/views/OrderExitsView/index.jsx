"use client";

import { Fragment, useState, useEffect } from "react";
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
  PackageMinus,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swrKeys, usePaginatedList, useDebouncedValue } from "@/lib/swr";
import Link from "next/link";
import { useWmsNavigate, useWmsSearchParams } from "@/hooks/useWmsRouter";
import SectionHistoryModal from "@/components/activity/SectionHistoryModal";
import ViewHistoryButton from "@/components/activity/ViewHistoryButton";
import { useViewHistory } from "@/hooks/useViewHistory";
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
import {
  getExits,
  getExit,
  createExit,
  updateExit,
  deleteExit,
  completeExit,
  createExitProduct,
  deleteExitProduct,
  deleteExitProductBin,
  exportExitOrdersToExcel,
  createExitDetail,
  updateExitDetail,
  reverseExitProduct,
  reassignExitProduct,
  replaceExitProductBin,
  processAllExitProducts,
} from "@/services/orderService";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import WmsSearchBar from "@/components/wms/WmsSearchBar";
import WmsListEmptyState from "@/components/wms/WmsListEmptyState";
import ExitsViewSkeleton from "./ExitsViewSkeleton";
import {
  WmsExpandItemsButton,
  WmsExpandItemsEmpty,
} from "@/components/wms/WmsExpandItemsButton";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import ModalQRValidation from "./components/ModalQRValidation";
import ModalImport from "./components/ModalImport";
import ModalReplaceBin from "./components/ModalReplaceBin";
import ExitExpandedProducts from "./components/ExitExpandedProducts";
import { canCRUD, getApiErrorMessage } from "@/services/httpClient";

const statusVariants = {
  pendiente: "warning",
  en_progreso: "primary",
  completada: "success",
  cancelada: "danger",
};

const statusLabels = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const outTypeLabels = {
  Palletizado: "Palletizado",
  Piso: "Piso",
};

const Exits = () => {
  const navigate = useWmsNavigate();
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const {
    historyOpen,
    historyType,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);
  const user = useAuth().user;
  const perms = canCRUD(user, "order", "exit");
  const isClientUser = !!user?.client && !user?.is_superuser;
  const isAdmin = user?.is_superuser || user?.is_staff;
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedExit, setSelectedExit] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("exit_code") || ""
  );
  const [filters, setFilters] = useState({ status: "", exit_date: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingExitId, setCompletingExitId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // Estados para el modal QR
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedBin, setSelectedBin] = useState(null);

  // Estado para el modal de importación
  const [showImportModal, setShowImportModal] = useState(false);

  // Estado para el modal de reemplazo de bin
  const [showReplaceBinModal, setShowReplaceBinModal] = useState(false);
  const [selectedBinToReplace, setSelectedBinToReplace] = useState(null);

  // Estados para modales de confirmación de eliminación
  const [showConfirmDeleteGroup, setShowConfirmDeleteGroup] = useState(false);
  const [showConfirmDeleteBin, setShowConfirmDeleteBin] = useState(false);
  const [selectedGroupToDelete, setSelectedGroupToDelete] = useState(null);
  const [selectedBinToDelete, setSelectedBinToDelete] = useState(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isDeletingBin, setIsDeletingBin] = useState(false);
  const [urlResolved, setUrlResolved] = useState(false);
  const [ready, setReady] = useState(false);

  // Estado para modal de confirmación de revertir operación
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedProductToReverse, setSelectedProductToReverse] =
    useState(null);
  const [isReversing, setIsReversing] = useState(false);

  // Estado para procesamiento masivo de bins
  const [processingGroupId, setProcessingGroupId] = useState(null);
  const [processingBinId, setProcessingBinId] = useState(null);

  // Estado para la pestaña inicial del modal
  const [initialTab, setInitialTab] = useState("details");

  const PAGE_SIZE = 20;

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);

  // Init desde URL: solo fija la búsqueda (exit_code ya viene en el estado inicial)
  useEffect(() => {
    let cancelled = false;

    const initFromUrl = async () => {
      const exitId = searchParams.get("exit_id");
      if (exitId && !searchParams.get("exit_code")) {
        try {
          const exit = await getExit(exitId);
          if (!cancelled && exit?.code) setSearchTerm(exit.code);
        } catch (error) {
          console.error("Error al resolver la salida:", error);
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
    results: exits,
    count: totalItems,
    totalPages,
    isLoading: isListLoading,
    error: listError,
    mutate: mutateExits,
  } = usePaginatedList({
    key: ready
      ? swrKeys.exits(currentPage, debouncedSearchTerm, filters)
      : null,
    fetcher: () => getExits(currentPage, filters, debouncedSearchTerm),
    pageSize: PAGE_SIZE,
  });
  const isLoading = isListLoading || !ready;

  useEffect(() => {
    if (listError) {
      console.error("Error al cargar las salidas:", listError);
      showAlert("danger", "Error al cargar las salidas");
    }
  }, [listError]);

  // Revalida la lista y devuelve los resultados frescos
  const loadExits = async () => {
    const data = await mutateExits();
    return data?.results ?? [];
  };

  const handleShowModal = (exit, mode, tab = "details") => {
    if (mode === "create") {
      setSelectedExit({
        client: null,
        branch: null,
        exit_product_groups: [
          {
            product: null,
            product_name: "",
            bin_or_batch: "",
            bin_or_batch_list: [""], // Agregar la nueva propiedad
            quantity: 0,
            exit_products: [
              {
                bin_id: null,
                bin_code: "",
                position: "",
                quantity: 0,
                is_picking: false,
              },
            ],
          },
        ],
        status: "pendiente",
        exit_date: null,
      });
    } else {
      setSelectedExit(exit);
    }
    setModalMode(mode);
    setInitialTab(tab);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedExit(null);
  };

  // Funciones para el modal QR
  const handleShowQRModal = (bin, groupId) => {
    const binWithGroup = {
      ...bin,
      exit_product_group_id: groupId,
    };
    setSelectedBin(binWithGroup);
    setShowQRModal(true);
  };

  const handleProcessBin = (bin, groupId) => {
    if (processingBinId !== null) return;
    setProcessingBinId(bin.id);
    setTimeout(() => {
      handleShowQRModal(bin, groupId);
    }, 0);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedBin(null);
    setProcessingBinId(null);
  };

  // Funciones para el modal de reemplazo de bin
  const handleShowReplaceBinModal = (bin) => {
    setSelectedBinToReplace(bin);
    setShowReplaceBinModal(true);
  };

  const handleCloseReplaceBinModal = () => {
    setShowReplaceBinModal(false);
    setSelectedBinToReplace(null);
  };

  const handleReplaceBinSuccess = async () => {
    // Recargar datos después del reemplazo exitoso
    const updatedExits = await loadExits();

    // Si hay un modal abierto con una salida seleccionada, actualizarla también
    if (selectedExit?.id && updatedExits) {
      const updatedExit = updatedExits.find((e) => e.id === selectedExit.id);
      if (updatedExit) {
        setSelectedExit(updatedExit);
      }
    }
  };

  const handleQRProcessSuccess = async () => {
    // Recargar datos después del procesamiento exitoso
    const updatedExits = await loadExits();

    // Si hay un modal abierto con una salida seleccionada, actualizarla también
    if (selectedExit?.id && updatedExits) {
      const updatedExit = updatedExits.find((e) => e.id === selectedExit.id);
      if (updatedExit) {
        setSelectedExit(updatedExit);
      }
    }

    showAlert("success", "Bin liberado exitosamente");
    setProcessingBinId(null);
  };

  // Mostrar modal de confirmación para revertir
  const handleShowReverseModal = (exitProductId, exitId) => {
    setSelectedProductToReverse({ exitProductId, exitId });
    setShowReverseModal(true);
  };

  // Revertir un ExitProduct procesado (solo admin)
  const handleReverseExitProduct = async () => {
    if (!selectedProductToReverse) return;

    setIsReversing(true);
    try {
      const result = await reverseExitProduct(
        selectedProductToReverse.exitProductId
      );

      if (result.success) {
        setShowReverseModal(false);
        setSelectedProductToReverse(null);

        // Recargar datos
        const updatedExits = await loadExits();

        // Actualizar selectedExit si está abierto
        if (selectedExit?.id && updatedExits) {
          const updatedExit = updatedExits.find(
            (e) => e.id === selectedExit.id
          );
          if (updatedExit) {
            setSelectedExit(updatedExit);
          }
        }

        showAlert(
          "success",
          `Operación reversada exitosamente. ${
            result.data?.position_restored
              ? `Posición ${result.data.position_restored} restaurada.`
              : ""
          }`
        );
      } else {
        showAlert("danger", result.message || "Error al revertir la operación");
      }
    } catch (error) {
      showAlert("danger", "Error al revertir la operación");
    } finally {
      setIsReversing(false);
    }
  };

  // Reasignar un ExitProduct a otro bin sin procesar
  const handleReassignExitProduct = async (exitProductId) => {
    try {
      const result = await reassignExitProduct(exitProductId);

      if (result.success) {
        // Recargar datos
        const updatedExits = await loadExits();

        // Actualizar selectedExit si está abierto
        if (selectedExit?.id && updatedExits) {
          const updatedExit = updatedExits.find(
            (e) => e.id === selectedExit.id
          );
          if (updatedExit) {
            setSelectedExit(updatedExit);
          }
        }

        showAlert(
          "success",
          result.data?.message || "Bin reasignado exitosamente"
        );
      } else {
        showAlert("danger", result.message || "Error al reasignar el bin");
      }
    } catch (error) {
      console.error("Error reasignando:", error);
      showAlert("danger", "Error al reasignar el bin");
    }
  };

  // Procesar todos los bins de un grupo de forma masiva
  const handleProcessAllBins = async (groupId) => {
    setProcessingGroupId(groupId);
    try {
      const result = await processAllExitProducts(groupId);

      // Encontrar el exit que contiene este grupo para actualizarlo
      const exitWithGroup = exits.find((e) =>
        e.exit_product_groups?.some((g) => g.id === groupId)
      );

      // Recargar datos de la lista completa
      await loadExits();

      // Actualizar selectedExit si está abierto (modal)
      if (selectedExit?.id) {
        const updatedExit = await getExit(selectedExit.id);
        if (updatedExit) {
          setSelectedExit(updatedExit);
        }
      }

      // Si el exit estaba expandido en el listado, también actualizar sus datos
      if (exitWithGroup?.id && expandedGroups[exitWithGroup.id]) {
        // Actualizar la salida en la caché de la lista con datos frescos
        const freshExit = await getExit(exitWithGroup.id);
        if (freshExit) {
          await mutateExits(
            (prev) =>
              prev && {
                ...prev,
                results: prev.results.map((e) =>
                  e.id === freshExit.id ? freshExit : e
                ),
              },
            { revalidate: false }
          );
        }
      }

      if (result.success) {
        showAlert(
          "success",
          `${result.message}. ${result.processed} bins procesados exitosamente.`
        );
      } else {
        showAlert(
          "warning",
          `${result.message}. ${result.processed} procesados, ${result.failed} fallidos.`
        );
      }
    } catch (error) {
      console.error("Error procesando bins masivamente:", error);
      showAlert(
        "danger",
        error.response?.data?.error || "Error al procesar los bins"
      );
    } finally {
      setProcessingGroupId(null);
    }
  };

  const handleShowConfirmDeleteGroup = (group) => {
    setSelectedGroupToDelete(group);
    setShowConfirmDeleteGroup(true);
  };

  const handleDeleteProductGroup = async () => {
    setIsDeletingGroup(true);
    try {
      await deleteExitProduct(selectedGroupToDelete.id);

      // Recargar la lista de salidas
      await loadExits();

      // Si hay un modal abierto, obtener los detalles completos de la salida
      if (selectedExit?.id) {
        const updatedExit = await getExit(selectedExit.id);
        if (updatedExit) {
          setSelectedExit(updatedExit);
        }
      }

      setShowConfirmDeleteGroup(false);
      showAlert(
        "success",
        "Producto eliminado exitosamente de la orden de salida"
      );
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      showAlert("danger", "Error al eliminar el producto");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleShowConfirmDeleteBin = (bin) => {
    setSelectedBinToDelete(bin);
    setShowConfirmDeleteBin(true);
  };

  const handleDeleteBin = async () => {
    setIsDeletingBin(true);
    try {
      await deleteExitProductBin(selectedBinToDelete.id);

      // Recargar la lista de salidas
      await loadExits();

      // Si hay un modal abierto, obtener los detalles completos de la salida
      if (selectedExit?.id) {
        const updatedExit = await getExit(selectedExit.id);
        if (updatedExit) {
          setSelectedExit(updatedExit);
        }
      }

      setShowConfirmDeleteBin(false);
      showAlert("success", "Bin eliminado exitosamente de la orden de salida");
    } catch (error) {
      console.error("Error al eliminar el bin:", error);
      showAlert("danger", "Error al eliminar el bin");
    } finally {
      setIsDeletingBin(false);
    }
  };

  // Verificar si todos los bins están procesados
  const areAllBinsProcessed = (exit) => {
    return exit.exit_product_groups.every((group) =>
      group.exit_products.every((product) => product.is_processed === true)
    );
  };

  // Verificar si la orden tiene bins de picking
  const hasPickingBins = (exit) => {
    return exit.exit_product_groups?.some((group) =>
      group.exit_products?.some((ep) => ep.is_picking)
    );
  };

  // Completar la salida
  const handleCompleteExit = async (exit) => {
    setCompletingExitId(exit.id);
    try {
      await completeExit(exit.id);
      await loadExits();
      showAlert("success", "Salida completada exitosamente");
    } catch (error) {
      console.error("Error al completar la salida:", error);
      const errorMsg =
        error.response?.data?.detail || "Error al completar la salida";
      showAlert("danger", errorMsg);
    } finally {
      setCompletingExitId(null);
    }
  };

  const handleShowConfirmDelete = (exit) => {
    setSelectedExit(exit);
    setShowConfirmModal(true);
  };

  const handleDeleteExit = async () => {
    setIsDeleting(true);
    try {
      await deleteExit(selectedExit.id);
      await loadExits();
      setShowConfirmModal(false);
      showAlert("success", "Salida eliminada exitosamente");
    } catch (error) {
      console.error("Error al eliminar la salida:", error);
      showAlert("danger", "Error al eliminar la salida");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveExit = async (exitData, productsToDelete = []) => {
    setIsSaving(true);
    try {
      let savedExit;

      const exitBasicData = {
        client_id: exitData.client?.id,
        branch_id: exitData.branch?.id,
        status: exitData.status,
        out_type: exitData.out_type || null,
        exit_date: exitData.exit_date || null,
      };

      if (exitData.id) {
        // Actualizar salida existente
        savedExit = await updateExit(exitData.id, exitBasicData);
      } else {
        // Crear nueva salida
        savedExit = await createExit(exitBasicData);
      }

      // Guardar/actualizar exit_detail (picking_pallets)
      if (
        exitData.picking_pallets !== undefined &&
        exitData.picking_pallets !== null
      ) {
        const exitDetailData = {
          exit_id: savedExit.id,
          picking_pallets: exitData.picking_pallets || 0,
        };

        if (exitData.exit_detail?.id) {
          // Actualizar exit_detail existente
          await updateExitDetail(exitData.exit_detail.id, exitDetailData);
        } else {
          // Crear nuevo exit_detail
          await createExitDetail(exitDetailData);
        }
      }

      // Actualizado para la nueva estructura
      if (exitData.exit_product_groups) {
        for (const group of exitData.exit_product_groups) {
          // Solo procesamos productos SIN ID para evitar duplicados
          if (!group.id) {
            // Para nuevos productos, enviamos product, quantity y bin_or_batch
            const productData = {
              exit: savedExit.id,
              product: group.product,
              quantity: group.quantity,
              bin_or_batch: group.bin_or_batch || null,
            };

            // Crear nuevo producto de salida
            await createExitProduct(productData);
          }
          // No hacemos nada con los productos que ya tienen ID (ya existen)
        }
      }

      await loadExits();
      handleCloseModal();
      showAlert("success", "Salida guardada exitosamente");
    } catch (error) {
      console.error("Error al guardar la salida:", error);
      showAlert("danger", `Error al guardar la salida: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Formato legible para la lista de salidas (ej: "Lunes, 14 de diciembre")
  const formatExitDate = (dateString) => {
    if (!dateString) return "Sin fecha";
    // Crear fecha en UTC para evitar problemas de zona horaria
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const dayName = date.toLocaleDateString("es-PA", { weekday: "long" });
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString("es-PA", { month: "long" });

    // Capitalizar primera letra del día
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return `${capitalizedDay}, ${dayNum} de ${monthName}`;
  };

  const handleNewExit = () => {
    handleShowModal(null, "create");
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleProductGroup = (groupId) => {
    setExpandedGroups((prev) => {
      // Si ya está abierto, lo cerramos
      if (prev[groupId]) {
        const newState = { ...prev };
        delete newState[groupId];
        return newState;
      } else {
        // Si está cerrado, cerramos todos los demás antes de abrir este
        const newState = {};
        newState[groupId] = true;
        return newState;
      }
    });
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const result = await exportExitOrdersToExcel({
        filters,
        search: debouncedSearchTerm,
        filename: `Ordenes_Salida_${new Date().toISOString().split("T")[0]}.xls`,
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

  const activeFilterCount = [filters.status, filters.exit_date].filter(Boolean).length;
  const hasFilters = Boolean(searchTerm) || activeFilterCount > 0;

  const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

  const exitDateOptions = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const value = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString("es-PA", { weekday: "long" });
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString("es-PA", { month: "long" });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayLabel = `${capitalizedDay}, ${dayNum} de ${monthName}`;
    const label = i === 0 ? `Hoy - ${dayLabel}` : i === 1 ? `Mañana - ${dayLabel}` : dayLabel;
    return { value, label };
  });

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({ status: "", exit_date: "" });
    setSearchParams({});
  };

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Órdenes de salida"
        description="Gestiona las órdenes de despacho del almacén."
        icon={PackageMinus}
        breadcrumbs={[
          { title: "Órdenes", active: true },
          { title: "Salidas", active: true },
        ]}
        actions={
          <>
            {isAdmin ? (
            <Button
              variant="success"
              size="sm"
                icon={Upload}
                onClick={() => setShowImportModal(true)}
            >
                Importar desde excel
            </Button>
            ) : null}
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
          </>
        }
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header className="justify-content-between border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/20 !py-3">
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <WmsSearchBar
                    id="search-exit"
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
                    className="!w-[300px] !min-w-[220px] !max-w-full shrink-0"
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
                        onClick={handleNewExit}
                      >
                        Nueva orden de salida
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {filtersOpen ? (
                    <motion.div
                      key="exits-filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {/* p-1: el anillo de focus de react-select no debe quedar recortado por overflow-hidden */}
                      <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Estado</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por estado"
                            placeholder="Todos"
                            options={statusOptions}
                            value={filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value || "")}
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Fecha de salida</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por fecha de salida"
                            placeholder="Todas"
                            options={exitDateOptions}
                            value={filters.exit_date}
                            onChange={(e) => handleFilterChange("exit_date", e.target.value || "")}
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
                <ExitsViewSkeleton />
              ) : exits.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[1040px]">
                  <Table.Head>
                      <tr>
                      <Table.HeaderCell className="min-w-[140px] normal-case tracking-normal">
                          Código
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                          Cliente / Sucursal
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
                      <Table.HeaderCell className="min-w-[140px] normal-case tracking-normal">
                        Salida
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[150px] normal-case tracking-normal">
                          Acciones
                      </Table.HeaderCell>
                      </tr>
                  </Table.Head>
                  <Table.Body>
                    {exits.map((exit) => (
                      <Fragment key={exit.id}>
                        <Table.Row>
                          <Table.Cell className="whitespace-nowrap font-mono text-xs">
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 text-left transition-colors hover:text-sky-600 ${
                                expandedGroups[exit.id]
                                  ? "font-semibold text-sky-600"
                                  : "text-slate-600"
                              }`}
                              onClick={() => toggleProductGroup(exit.id)}
                              aria-expanded={Boolean(expandedGroups[exit.id])}
                            >
                              {expandedGroups[exit.id] ? (
                                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                              )}
                              {exit.code}
                            </button>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="font-medium text-slate-900">
                                  {exit.client?.name || "Sin cliente"}
                            </div>
                            <div className="text-sm text-slate-500">
                                  {exit.branch?.name || "Sin sucursal"}
                              </div>
                          </Table.Cell>
                          <Table.Cell>
                            {exit.exit_product_groups?.length > 0 ? (
                              <WmsExpandItemsButton
                                count={exit.exit_product_groups.length}
                                expanded={Boolean(expandedGroups[exit.id])}
                                onClick={() => toggleProductGroup(exit.id)}
                                suffix={
                                  <span className="ms-1 text-slate-500">
                                        (
                                        {exit.exit_product_groups.reduce(
                                          (sum, g) => sum + (g.quantity || 0),
                                      0,
                                        )}{" "}
                                        uds)
                                      </span>
                                }
                              />
                            ) : (
                              <WmsExpandItemsEmpty />
                            )}
                          </Table.Cell>
                          <Table.Cell>
                              <Badge
                              variant={statusVariants[exit.status] || "secondary"}
                              dot={false}
                              >
                                {statusLabels[exit.status] || "Desconocido"}
                              </Badge>
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-slate-600">
                              {formatDate(exit.created_at)}
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-slate-600">
                              {formatExitDate(exit.exit_date)}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-1">
                              {exit.status === "completada" &&
                                  exit.exit_detail?.pdf_document && (
                                    <Link
                                    href={exit.exit_detail.pdf_document}
                                      target="_blank"
                                    rel="noopener noreferrer"
                                    title="Ver PDF"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50"
                                    >
                                    <FileText className="h-4 w-4" />
                                    </Link>
                                  )}
                                {areAllBinsProcessed(exit) &&
                                  exit.status !== "completada" &&
                                  !isClientUser && (
                                  <IconButton
                                    size="sm"
                                    className="text-emerald-600 hover:bg-emerald-50"
                                      onClick={() => handleCompleteExit(exit)}
                                      disabled={completingExitId === exit.id}
                                      title="Completar salida"
                                    >
                                      {completingExitId === exit.id ? (
                                        <span
                                        className="spinner-border spinner-border-sm"
                                          role="status"
                                          aria-hidden="true"
                                      />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </IconButton>
                                )}
                              <IconButton
                                size="sm"
                                className="text-sky-600 hover:bg-sky-50"
                                  onClick={() => handleShowModal(exit, "view")}
                                title="Ver salida"
                              >
                                <Eye className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                size="sm"
                                className="text-amber-600 hover:bg-amber-50"
                                onClick={() => handleShowModal(exit, "view", "movements")}
                                  title="Ver historial de movimientos"
                                >
                                <History className="h-4 w-4" />
                              </IconButton>
                                {perms.change && (
                                <IconButton
                                  size="sm"
                                  className="text-violet-600 hover:bg-violet-50"
                                  onClick={() => handleShowModal(exit, "edit")}
                                  title="Editar salida"
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconButton>
                                )}
                                {perms.delete && (
                                <IconButton
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleShowConfirmDelete(exit)}
                                  title="Eliminar salida"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                                )}
                              </div>
                          </Table.Cell>
                        </Table.Row>
                          {expandedGroups[exit.id] && (
                            <Table.Row className="border-0">
                              <Table.Cell colSpan={7} className="!border-0 !p-0">
                                <ExitExpandedProducts
                                  exit={exit}
                                  isAdmin={isAdmin}
                                  isClientUser={isClientUser}
                                  navigate={navigate}
                                  onProcessAllBins={handleProcessAllBins}
                                  onProcessBin={handleProcessBin}
                                  onReassign={handleReassignExitProduct}
                                  onReplaceBin={handleShowReplaceBinModal}
                                  onReverse={handleShowReverseModal}
                                  processingGroupId={processingGroupId}
                                  processingBinId={processingBinId}
                                />
                              </Table.Cell>
                            </Table.Row>
                          )}
                        </Fragment>
                      ))}
                  </Table.Body>
                  </Table>
              ) : (
                <WmsListEmptyState
                  hasFilters={hasFilters}
                  canCreate={perms.add}
                  onClearFilters={clearFilters}
                  onCreate={handleNewExit}
                  emptyTitle="No hay salidas registradas"
                  emptyDescription="Comienza creando tu primera orden de salida."
                  createLabel="Nueva orden de salida"
                />
              )}
            </Card.Body>
            {exits.length > 0 && (
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
        selectedExit={selectedExit}
        setSelectedExit={setSelectedExit}
        isSaving={isSaving}
        handleSaveExit={handleSaveExit}
        statusLabels={statusLabels}
        outTypeLabels={outTypeLabels}
        handleShowConfirmDeleteGroup={handleShowConfirmDeleteGroup}
        handleShowConfirmDeleteBin={handleShowConfirmDeleteBin}
        handleShowQRModal={handleShowQRModal}
        showQRModal={showQRModal}
        handleShowReverseModal={handleShowReverseModal}
        handleReassignExitProduct={handleReassignExitProduct}
        handleShowReplaceBinModal={handleShowReplaceBinModal}
        handleProcessAllBins={handleProcessAllBins}
        processingGroupId={processingGroupId}
        initialTab={initialTab}
      />

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="exit"
        title="Historial de movimientos de salidas"
        initialAction={historyType}
        initialBatchId={historyBatch}
        onOpenItem={async (item) => {
          if (!item?.resource_id) return;
          try {
            const exit = await getExit(item.resource_id);
            handleShowModal(exit, "view", "movements");
          } catch (err) {
            showAlert(
              "danger",
              getApiErrorMessage(err, "No se pudo abrir la salida."),
            );
          }
        }}
      />

      <ModalConfirm
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        isDeleting={isDeleting}
        handleDeleteExit={handleDeleteExit}
        selectedExit={selectedExit}
      />

      <ModalQRValidation
        showModal={showQRModal}
        handleCloseModal={handleCloseQRModal}
        selectedBin={selectedBin}
        onProcessSuccess={handleQRProcessSuccess}
      />

      <ModalReplaceBin
        showModal={showReplaceBinModal}
        handleCloseModal={handleCloseReplaceBinModal}
        selectedBin={selectedBinToReplace}
        onReplaceSuccess={handleReplaceBinSuccess}
      />

      {/* Modal para confirmar eliminación de grupo de productos */}
      <ModalConfirm
        showConfirmModal={showConfirmDeleteGroup}
        setShowConfirmModal={setShowConfirmDeleteGroup}
        isDeleting={isDeletingGroup}
        handleDeleteExit={handleDeleteProductGroup}
        selectedExit={selectedGroupToDelete}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto y todos sus bins de la orden de salida?"
      />

      {/* Modal para confirmar eliminación de bin */}
      <ModalConfirm
        showConfirmModal={showConfirmDeleteBin}
        setShowConfirmModal={setShowConfirmDeleteBin}
        isDeleting={isDeletingBin}
        handleDeleteExit={handleDeleteBin}
        selectedExit={selectedBinToDelete}
        title="Eliminar Bin"
        message={`¿Estás seguro de que deseas eliminar el bin ${
          selectedBinToDelete?.bin_code || ""
        } de la orden de salida?`}
      />

      {/* Modal para importar salidas desde Excel */}
      <ModalImport
        showModal={showImportModal}
        handleCloseModal={() => setShowImportModal(false)}
        onImportSuccess={() => {
          loadExits();
          setShowImportModal(false);
        }}
      />

      {/* Modal de confirmación para revertir operación */}
      <Modal
        show={showReverseModal}
        onHide={() => {
          setShowReverseModal(false);
          setSelectedProductToReverse(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="ri-arrow-go-back-line me-2 text-warning"></i>
            Confirmar Reversión
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">¿Estás seguro de revertir esta operación?</p>
          <small className="text-muted">
            Se restaurará el inventario del bin y la posición volverá a estar
            disponible.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowReverseModal(false);
              setSelectedProductToReverse(null);
            }}
            disabled={isReversing}
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleReverseExitProduct}
            disabled={isReversing}
          >
            {isReversing ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                Revirtiendo...
              </>
            ) : (
              <>
                <i className="ri-arrow-go-back-line me-1"></i>
                Revertir operación
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default Exits;
