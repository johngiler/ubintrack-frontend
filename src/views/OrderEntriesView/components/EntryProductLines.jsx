"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button, Form } from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import AsyncSelect from "@/components/ui/AsyncSelect";
import VisibleSliceList from "@/components/ui/VisibleSliceList";


function CompactFieldLabel({ children, required = false }) {
  return (
    <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
}

function emptyOrNumberValue(value) {
  if (value == null || value === 0) return "";
  return String(value);
}

function clearProductFieldError(setValidationErrors, index, field) {
  setValidationErrors((prev) => {
    const newProductErrors = { ...prev.products };
    if (newProductErrors[index]) {
      delete newProductErrors[index][field];
      if (Object.keys(newProductErrors[index]).length === 0) {
        delete newProductErrors[index];
      }
    }
    return { ...prev, products: newProductErrors };
  });
}

export default function EntryProductLines({
  selectedEntry,
  modalMode,
  isViewMode,
  products,
  isLoadingProducts,
  validationErrors,
  loadProductOptions,
  handleProductChange,
  handleRemoveProduct,
  handleAddProduct,
  setValidationErrors,
}) {
  const canEditLines = !isViewMode && selectedEntry.status !== "completada";
  const entryProducts = selectedEntry.entry_products || [];

  return (
    <>
      {validationErrors.products.general ? (
        <p className="mb-2 text-xs text-red-600">{validationErrors.products.general}</p>
      ) : null}

      <VisibleSliceList items={entryProducts} itemLabel="productos" className="space-y-2.5">
        {(visibleProducts) =>
          visibleProducts.map((product, index) => (
          <article
            key={product.id ?? index}
            className="rounded-lg border border-[var(--border-subtle)] bg-white/90 p-3 shadow-sm dark:bg-[var(--card)]/90"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium tabular-nums text-[var(--foreground-muted)]">
                Línea {index + 1}
              </span>
              {canEditLines ? (
                <IconButton
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  onClick={() => handleRemoveProduct(index)}
                  disabled={selectedEntry.entry_products.length <= 1}
                  aria-label="Eliminar línea"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-6 lg:grid-cols-12">
              <div className="col-span-2 sm:col-span-6 lg:col-span-5">
                <CompactFieldLabel required>Producto</CompactFieldLabel>
                <Form.Group controlId={`product-${index}`} className="mb-0">
                  <AsyncSelect
                    inputId={`product-${index}`}
                    name={`product-${index}`}
                    size="sm"
                    value={
                      product.product
                        ? {
                            value: product.product.id,
                            label: product.product.name,
                            name: product.product.name,
                            client_sku: product.product.client_sku || "",
                            ...product.product,
                          }
                        : null
                    }
                    loadOptions={loadProductOptions}
                    defaultOptions={products.map((p) => ({
                      value: p.id,
                      label: p.name,
                      ...p,
                    }))}
                    isDisabled={
                      (modalMode === "edit" && product.id) ||
                      isViewMode ||
                      isLoadingProducts ||
                      !selectedEntry?.client
                    }
                    isLoading={isLoadingProducts}
                    onChange={(selected) => {
                      handleProductChange(
                        index,
                        "product",
                        selected
                          ? {
                              id: selected.value,
                              name: selected.label,
                              client_sku: selected.client_sku || "",
                            }
                          : null,
                      );
                      clearProductFieldError(setValidationErrors, index, "product");
                    }}
                    placeholder={
                      isLoadingProducts
                        ? "Cargando productos…"
                        : !selectedEntry?.client
                          ? "Seleccione un cliente primero"
                          : "Seleccione un producto"
                    }
                    isClearable
                    noOptionsMessage={({ inputValue }) =>
                      !selectedEntry?.client
                        ? "Seleccione un cliente primero"
                        : products.length === 0
                          ? "Sin productos para este cliente"
                          : inputValue
                            ? "Sin resultados"
                            : "Seleccione un producto"
                    }
                    isInvalid={!!validationErrors.products[index]?.product}
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                    formatOptionLabel={(option, { context }) => (
                      <div
                        className="text-xs leading-snug"
                        style={{
                          fontWeight: context === "value" ? 400 : 600,
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                        }}
                      >
                        {option.name || option.label}
                        {option.client_sku ? (
                          <span className="font-normal text-slate-500"> · SKU {option.client_sku}</span>
                        ) : null}
                      </div>
                    )}
                  />
                  {validationErrors.products[index]?.product ? (
                    <Form.Text className="text-danger">{validationErrors.products[index].product}</Form.Text>
                  ) : null}
                </Form.Group>
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <CompactFieldLabel required>Cant. reportada</CompactFieldLabel>
                <Form.Group controlId={`quantity-${index}`} className="mb-0">
                  <Form.Control
                    name={`quantity-${index}`}
                    type="number"
                    size="sm"
                    value={emptyOrNumberValue(product.quantity)}
                    disabled={(modalMode === "edit" && product.id) || isViewMode}
                    onChange={(e) => {
                      handleProductChange(
                        index,
                        "quantity",
                        e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                      );
                      clearProductFieldError(setValidationErrors, index, "quantity");
                    }}
                    isInvalid={!!validationErrors.products[index]?.quantity}
                  />
                  {validationErrors.products[index]?.quantity ? (
                    <Form.Text className="text-danger">{validationErrors.products[index].quantity}</Form.Text>
                  ) : null}
                </Form.Group>
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <CompactFieldLabel>Cant. real</CompactFieldLabel>
                <Form.Group controlId={`real_quantity-${index}`} className="mb-0">
                  <Form.Control
                    name={`real_quantity-${index}`}
                    type="number"
                    size="sm"
                    value={emptyOrNumberValue(product.real_quantity)}
                    disabled={isViewMode}
                    onChange={(e) => {
                      handleProductChange(
                        index,
                        "real_quantity",
                        e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                      );
                      clearProductFieldError(setValidationErrors, index, "real_quantity");
                    }}
                    isInvalid={!!validationErrors.products[index]?.real_quantity}
                  />
                  {validationErrors.products[index]?.real_quantity ? (
                    <Form.Text className="text-danger">
                      {validationErrors.products[index].real_quantity}
                    </Form.Text>
                  ) : null}
                </Form.Group>
              </div>

              <div className="col-span-1 sm:col-span-3 lg:col-span-2">
                <CompactFieldLabel>Expiración</CompactFieldLabel>
                <Form.Group controlId={`expiration_date-${index}`} className="mb-0">
                  <Form.Control
                    name={`expiration_date-${index}`}
                    type="date"
                    size="sm"
                    value={product.expiration_date || ""}
                    disabled={isViewMode}
                    onChange={(e) => {
                      handleProductChange(index, "expiration_date", e.target.value);
                      clearProductFieldError(setValidationErrors, index, "expiration_date");
                    }}
                    isInvalid={!!validationErrors.products[index]?.expiration_date}
                  />
                  {validationErrors.products[index]?.expiration_date ? (
                    <Form.Text className="text-danger">
                      {validationErrors.products[index].expiration_date}
                    </Form.Text>
                  ) : null}
                </Form.Group>
              </div>

              <div className="col-span-1 sm:col-span-3 lg:col-span-1">
                <CompactFieldLabel>Lote</CompactFieldLabel>
                <Form.Group controlId={`batch-${index}`} className="mb-0">
                  <Form.Control
                    name={`batch-${index}`}
                    type="text"
                    size="sm"
                    value={product.batch || ""}
                    disabled={isViewMode}
                    onChange={(e) => handleProductChange(index, "batch", e.target.value)}
                  />
                </Form.Group>
              </div>
            </div>

            {isViewMode ? (
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-2 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  En inventario: <strong className="font-medium text-slate-800 dark:text-slate-200">{product.in_inventory || 0}</strong>
                </span>
                <span>
                  Completado:{" "}
                  <strong className="font-medium text-slate-800 dark:text-slate-200">
                    {product.is_completed ? "Sí" : "No"}
                  </strong>
                </span>
              </div>
            ) : null}
          </article>
          ))
        }
      </VisibleSliceList>

      {canEditLines ? (
        <div className="mt-3 flex justify-end border-t border-[var(--border-subtle)] pt-3">
          <Button variant="success" size="sm" icon={Plus} onClick={handleAddProduct}>
            Agregar producto
          </Button>
        </div>
      ) : null}
    </>
  );
}
