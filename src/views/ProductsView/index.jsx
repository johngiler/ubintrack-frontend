"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Download, Eye, FilterX, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedInventory, setExpandedInventory] = useState({});
  const [urlSearchInitialized, setUrlSearchInitialized] = useState(false);

  useEffect(() => {
    if (urlSearchInitialized) return;
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchTerm(searchParam);
      setDebouncedSearchTerm(searchParam);
    }
    setUrlSearchInitialized(true);
  }, [urlSearchInitialized, searchParams]);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.category, filters.rotation_type, filters.condition]);

  const showAlertMessage = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getProducts(currentPage, filters, debouncedSearchTerm);
      setProducts(response.results || []);
      setTotalItems(response.count || 0);
      setTotalPages(Math.ceil((response.count || 0) / PAGE_SIZE));
    } catch {
      showAlertMessage("danger", "Error al cargar los productos");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, filters, showAlertMessage]);

  useEffect(() => {
    if (!urlSearchInitialized) return;
    loadProducts();
  }, [loadProducts, urlSearchInitialized]);

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
    setDebouncedSearchTerm("");
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

  const hasFilters =
    Boolean(debouncedSearchTerm) ||
    Boolean(filters.category) ||
    Boolean(filters.rotation_type) ||
    Boolean(filters.condition);

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
              <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto">
                <WmsSearchBar
                  id="search-product"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onClear={() => handleSearchChange("")}
                  placeholder="Buscar por nombre, SKU o cliente…"
                  className="!w-[280px] !min-w-[280px] !max-w-[280px] shrink-0"
                />
                <Form.Select
                  id="filter-rotation"
                  name="filter-rotation"
                  size="sm"
                  value={filters.rotation_type}
                  onChange={(e) => handleFilterChange("rotation_type", e.target.value)}
                  aria-label="Filtrar por rotación"
                  className="!w-[130px] shrink-0"
                  style={{ minWidth: "130px" }}
                >
                  <option value="">Rotación</option>
                  {Object.entries(rotationTypeLabels).map(([value, label]) => (
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
                <Form.Select
                  id="filter-category"
                  name="filter-category"
                  size="sm"
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                  aria-label="Filtrar por categoría"
                  className="!w-[160px] shrink-0"
                  style={{ minWidth: "160px" }}
                >
                  <option value="">Categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
                      onClick={handleNewProduct}
                    >
                      Nuevo producto
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
    </Fragment>
  );
}
