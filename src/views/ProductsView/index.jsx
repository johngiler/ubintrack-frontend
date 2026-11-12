"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, Download, Eye, Filter, FilterX, Package, Pencil, Plus, Trash2 } from "lucide-react";
import SectionHistoryModal from "@/components/activity/SectionHistoryModal";
import ViewHistoryButton from "@/components/activity/ViewHistoryButton";
import { useViewHistory } from "@/hooks/useViewHistory";
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
import ProductsViewSkeleton from "./ProductsViewSkeleton";
import { useWmsSearchParams } from "@/hooks/useWmsRouter";
import { getProducts, getCategories, exportProductsToExcel } from "@/services/inventoryService";
import { canCRUD } from "@/services/httpClient";
import { conditionLabels, rotationTypeLabels } from "@/lib/productLabels";
import ModalEdit from "./components/ModalEdit";
import ModalConfirm from "./components/ModalConfirm";
import ProductInventoryBins from "./components/ProductInventoryBins";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  category: "",
  rotation_type: "",
  condition: "",
};

export default function ProductsView() {
  const authUser = useAuth().user;
  const perms = canCRUD(authUser, "inventory", "product");
  const [searchParams, setSearchParams] = useWmsSearchParams();
  const {
    historyOpen,
    historyType,
    historyBatch,
    openHistory,
    closeHistory,
  } = useViewHistory(searchParams, setSearchParams);

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedInventory, setExpandedInventory] = useState({});

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const { data: categories = [] } = useSWR(swrKeys.categories, async () => {
    const data = await getCategories();
    return Array.isArray(data) ? data : data.results || [];
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.category, filters.rotation_type, filters.condition]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const {
    results: products,
    count: totalItems,
    totalPages,
    isLoading,
    error,
    mutate: loadProducts,
  } = usePaginatedList({
    key: swrKeys.products(currentPage, debouncedSearchTerm, filters),
    fetcher: () => getProducts(currentPage, filters, debouncedSearchTerm),
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (error) showAlertMessage("danger", "Error al cargar los productos");
  }, [error, showAlertMessage]);

  const clearUrlSearch = () => {
    if (searchParams.get("search")) {
      setSearchParams(new URLSearchParams());
    }
  };

  const handleFilterChange = (field, value) => {
    clearUrlSearch();
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearUrlSearch();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
    clearUrlSearch();
  };

  const handleShowModal = (productItem, mode) => {
    setSelectedProduct(productItem);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const toggleInventory = (productId) => {
    setExpandedInventory((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const result = await exportProductsToExcel({
        filters,
        search: debouncedSearchTerm,
        filename: `Productos_${new Date().toISOString().split("T")[0]}.xls`,
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

  const activeFilterCount = [
    filters.category,
    filters.rotation_type,
    filters.condition,
  ].filter(Boolean).length;

  const hasFilters = Boolean(debouncedSearchTerm) || activeFilterCount > 0;

  const rotationOptions = useMemo(
    () => Object.entries(rotationTypeLabels).map(([value, label]) => ({ value, label })),
    [],
  );
  const conditionOptions = useMemo(
    () => Object.entries(conditionLabels).map(([value, label]) => ({ value, label })),
    [],
  );
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.name })),
    [categories],
  );

  return (
    <Fragment>
      {alert.show && (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      )}

      <WmsPageHeader
        title="Productos"
        description="Catálogo de productos del inventario WMS."
        icon={Package}
        breadcrumbs={[
          { title: "Inventario", active: true },
          { title: "Productos", active: true },
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
                    id="search-product"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClear={() => handleSearchChange("")}
                    placeholder="Buscar por nombre, SKU o cliente…"
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
                        onClick={handleNewProduct}
                      >
                        Nuevo producto
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {filtersOpen ? (
                    <motion.div
                      key="products-filters"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {/* p-1: el anillo de focus de react-select no debe quedar recortado por overflow-hidden */}
                      <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] p-1 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Rotación</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por rotación"
                            placeholder="Todas"
                            options={rotationOptions}
                            value={filters.rotation_type}
                            onChange={(e) => handleFilterChange("rotation_type", e.target.value || "")}
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Condición</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por condición"
                            placeholder="Todas"
                            options={conditionOptions}
                            value={filters.condition}
                            onChange={(e) => handleFilterChange("condition", e.target.value || "")}
                          />
                        </Form.Group>
                        <Form.Group className="mb-0">
                          <Form.Label className="text-xs">Categoría</Form.Label>
                          <Select
                            size="sm"
                            isClearable
                            aria-label="Filtrar por categoría"
                            placeholder="Todas"
                            options={categoryOptions}
                            value={filters.category}
                            onChange={(e) => handleFilterChange("category", e.target.value || "")}
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
                <ProductsViewSkeleton />
              ) : products.length > 0 ? (
                <Table hover responsive className="mb-0 min-w-[1080px]">
                  <Table.Head>
                    <tr>
                      <Table.HeaderCell className="min-w-[180px] normal-case tracking-normal">
                        Código
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[240px] normal-case tracking-normal">
                        Nombre / Cliente
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[140px] normal-case tracking-normal">
                        Categoría
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[110px] normal-case tracking-normal">
                        Condición
                      </Table.HeaderCell>
                      <Table.HeaderCell className="min-w-[120px] normal-case tracking-normal">
                        Inventario
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
                    {products.map((productItem) => (
                      <Fragment key={productItem.id}>
                        <Table.Row>
                          <Table.Cell className="font-mono text-xs text-slate-600">
                            {productItem.code}
                          </Table.Cell>
                          <Table.Cell className="max-w-[300px]">
                            <div className="truncate font-medium text-slate-900">
                              {productItem.name}
                            </div>
                            <div className="truncate text-sm text-slate-500">
                              {productItem.client?.name || "—"}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="text-slate-600">
                            {productItem.category?.name || "—"}
                          </Table.Cell>
                          <Table.Cell className="text-slate-600">
                            {conditionLabels[productItem.condition] || productItem.condition || "—"}
                          </Table.Cell>
                          <Table.Cell>
                            {productItem.inventory_total > 0 ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700 hover:bg-amber-100"
                                onClick={() => toggleInventory(productItem.id)}
                              >
                                {productItem.inventory_total} {productItem.uom}
                                {expandedInventory[productItem.id] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              variant={productItem.is_active ? "success" : "danger"}
                              dot={false}
                            >
                              {productItem.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-1">
                              <IconButton
                                size="sm"
                                className="text-sky-600 hover:bg-sky-50"
                                onClick={() => handleShowModal(productItem, "view")}
                                title="Ver producto"
                              >
                                <Eye className="h-4 w-4" />
                              </IconButton>
                              {perms.change && (
                                <IconButton
                                  size="sm"
                                  className="text-violet-600 hover:bg-violet-50"
                                  onClick={() => handleShowModal(productItem, "edit")}
                                  title="Editar producto"
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconButton>
                              )}
                              {perms.delete && (
                                <IconButton
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedProduct(productItem);
                                    setShowConfirmModal(true);
                                  }}
                                  title="Eliminar producto"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                        {expandedInventory[productItem.id] && (
                          <ProductInventoryBins product={productItem} />
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
                  onCreate={handleNewProduct}
                  emptyTitle="No hay productos"
                  emptyDescription="Comienza registrando productos en el catálogo de inventario."
                  filtersTitle="No se encontraron productos"
                  filtersDescription="Intenta ajustar tu búsqueda o filtros para encontrar el producto que buscas."
                  createLabel="Nuevo producto"
                />
              )}
            </Card.Body>

            {products.length > 0 && (
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
        product={selectedProduct}
        mode={modalMode}
        onSave={loadProducts}
        showAlert={showAlertMessage}
      />

      <ModalConfirm
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        product={selectedProduct}
        onDelete={loadProducts}
        showAlert={showAlertMessage}
      />

      <SectionHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        section="product"
        title="Historial de movimientos de productos"
        initialAction={historyType}
        initialBatchId={historyBatch}
      />
    </Fragment>
  );
}
