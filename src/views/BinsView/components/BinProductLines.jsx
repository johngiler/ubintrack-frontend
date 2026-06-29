"use client";

import { Form } from "@/components/ui/bootstrap";
import AsyncSelect from "@/components/ui/AsyncSelect";

function CompactFieldLabel({ children, required = false }) {
  return (
    <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
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

function formatBinProductOption(option, { context }) {
  const realQty = option.real_quantity || 0;
  const inInventory = option.in_inventory || 0;
  const available = Math.max(0, realQty - inInventory);
  const sku = option.product?.client_sku || option.product?.product?.client_sku;
  const productName = option.product?.name || option.product?.product?.name;

  return (
    <div className="py-0.5">
      <div
        className="text-xs leading-snug text-slate-800"
        style={{ fontWeight: context === "value" ? 400 : 600 }}
      >
        {productName}
      </div>
      {sku ? <div className="text-[11px] text-slate-500">SKU: {sku}</div> : null}
      {context === "menu" ? (
        <div className="mt-1 flex justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex flex-col gap-0.5">
            <span>
              Exp:{" "}
              {option.expiration_date || option.product?.expiration_date
                ? new Date(
                    option.expiration_date || option.product?.expiration_date,
                  ).toLocaleDateString("es-ES")
                : "N/A"}
            </span>
            <span>Lote: {option.batch || option.product?.batch || "N/A"}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span>Real: {realQty}</span>
            <span>Disponible: {available}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BinProductLines({
  selectedEntry,
  isViewMode,
  isCreateMode,
  defaultProducts,
  isLoadingProducts,
  validationErrors,
  loadProductOptions,
  handleProductChange,
  setValidationErrors,
}) {
  const fieldsDisabled =
    isViewMode ||
    (selectedEntry?.id && selectedEntry?.status !== "en_recibo");

  return (
    <div className="space-y-2.5">
      {selectedEntry?.bin_products?.map((product, index) => (
        <article
          key={product.id || `product-${product.tempId || index}`}
          className="rounded-lg border border-[var(--border-subtle)] bg-white/90 p-3 shadow-sm dark:bg-[var(--card)]/90"
        >
          <div className="mb-2.5">
            <span className="text-[11px] font-medium tabular-nums text-[var(--foreground-muted)]">
              Producto del bin
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-6 lg:grid-cols-12">
            <div className="col-span-2 sm:col-span-6 lg:col-span-5">
              <CompactFieldLabel required>Producto</CompactFieldLabel>
              <Form.Group controlId={`product-select-${index}`} className="mb-0">
                <AsyncSelect
                  inputId={`product-select-${index}`}
                  name={`product-${index}`}
                  size="sm"
                  value={product.product}
                  loadOptions={loadProductOptions}
                  isDisabled={fieldsDisabled || !selectedEntry?.entry}
                  isLoading={isLoadingProducts}
                  onChange={(selected) => {
                    handleProductChange(index, "product", selected);
                    clearProductFieldError(setValidationErrors, index, "product");
                  }}
                  placeholder={
                    isLoadingProducts
                      ? "Cargando productos…"
                      : !selectedEntry?.entry
                        ? "Seleccione una orden primero"
                        : "Seleccione un producto"
                  }
                  isClearable={!fieldsDisabled}
                  defaultOptions={!isViewMode && defaultProducts}
                  isInvalid={!!validationErrors.products[index]?.product}
                  noOptionsMessage={({ inputValue }) =>
                    !selectedEntry?.entry
                      ? "Seleccione una orden primero"
                      : inputValue
                        ? "Sin resultados"
                        : "Seleccione un producto"
                  }
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  formatOptionLabel={formatBinProductOption}
                />
                {validationErrors.products[index]?.product ? (
                  <Form.Text className="text-danger">
                    {validationErrors.products[index].product}
                  </Form.Text>
                ) : null}
              </Form.Group>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <CompactFieldLabel required>Cantidad</CompactFieldLabel>
              <Form.Group controlId={`quantity-${index}`} className="mb-0">
                <Form.Control
                  name={`quantity-${index}`}
                  type="number"
                  size="sm"
                  value={product.quantity === 0 ? "" : product.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleProductChange(index, "quantity", value === "" ? 0 : parseInt(value, 10));
                  }}
                  disabled={fieldsDisabled}
                  min="0"
                  placeholder="0"
                  isInvalid={!!validationErrors.products[index]?.quantity}
                />
                {validationErrors.products[index]?.quantity ? (
                  <Form.Text className="text-danger">
                    {validationErrors.products[index].quantity}
                  </Form.Text>
                ) : null}
              </Form.Group>
            </div>

            <div className="col-span-1 sm:col-span-3 lg:col-span-2">
              <CompactFieldLabel>Expiración</CompactFieldLabel>
              <Form.Group controlId={`expiration-date-${index}`} className="mb-0">
                <Form.Control
                  name={`expiration-date-${index}`}
                  type="date"
                  size="sm"
                  value={
                    product.expiration_date || product.product?.expiration_date || ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    handleProductChange(index, "expiration_date", value === "" ? null : value);
                  }}
                  disabled={fieldsDisabled}
                />
              </Form.Group>
            </div>

            <div className="col-span-1 sm:col-span-3 lg:col-span-3">
              <CompactFieldLabel>Lote</CompactFieldLabel>
              <Form.Group controlId={`batch-${index}`} className="mb-0">
                <Form.Control
                  name={`batch-${index}`}
                  type="text"
                  size="sm"
                  value={product.batch || ""}
                  onChange={(e) => handleProductChange(index, "batch", e.target.value)}
                  disabled={fieldsDisabled}
                  placeholder="Lote"
                />
              </Form.Group>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
