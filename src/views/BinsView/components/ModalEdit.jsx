"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Printer, RefreshCw, Save, X } from "lucide-react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Tabs,
  Tab,
  Badge,
} from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import { useWmsNavigate, useWmsSearchParams } from "@/hooks/useWmsRouter";
import AsyncSelect from "@/components/ui/AsyncSelect";
import VisibleSliceList from "@/components/ui/VisibleSliceList";
import BinProductLines from "./BinProductLines";

import { getPositions } from "@/services/storageService";
import { formatDate } from "@/lib/format";
import {
  getEntries,
  getEntryProducts,
} from "@/services/orderService";

import {
  regenerateBinTag,
  printBinTag,
} from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";
import BinMovementsTimeline from "./BinMovementsTimeline";

const ModalEdit = ({
  showModal,
  handleCloseModal,
  modalMode,
  selectedEntry,
  setSelectedEntry,
  isSaving,
  handleSaveEntry,
  statusLabels,
  errorResponse,
  initialTab = "details",
}) => {
  const navigate = useWmsNavigate();
  const isViewMode = modalMode === "view";
  const isCreateMode = modalMode === "create";

  const [defaultEntries, setDefaultEntries] = useState([]);
  const [defaultProducts, setDefaultProducts] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [backendErrors, setBackendErrors] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [validationErrors, setValidationErrors] = useState({
    entry: null,
    status: null,
    products: {},
  });

  // Actualizar la pestaña activa cuando cambie initialTab o se abra el modal
  useEffect(() => {
    if (showModal) {
      setActiveTab(initialTab);
    }
  }, [showModal, initialTab]);

  useEffect(() => {
    if (showModal) {
      if (modalMode === "view") {
        if (selectedEntry) {
          // Cargar datos para visualización
          if (selectedEntry.entry?.id) {
            const formattedEntry = {
              ...selectedEntry.entry,
              value: selectedEntry.entry.id,
              label: selectedEntry.entry.code,
            };

            // Formatear posición si existe
            const formattedPosition = selectedEntry.position
              ? {
                  ...selectedEntry.position,
                  value: selectedEntry.position.id,
                  label: selectedEntry.position.code,
                }
              : null;

            // Formatear los productos para visualización
            const formattedProducts =
              selectedEntry.bin_products?.map((p) => {
                if (!p.entry_product) {
                  return {
                    id: p.id,
                    product: null,
                    quantity: p.quantity || 0,
                    batch: p.batch || "",
                    expiration_date: p.expiration_date || "",
                  };
                }

                return {
                  id: p.id,
                  product: {
                    value: p.entry_product.id,
                    label:
                      p.entry_product.product?.name || "Producto sin nombre",
                    ...p.entry_product,
                  },
                  quantity: p.quantity,
                  batch: p.batch || p.entry_product?.batch || "",
                  expiration_date:
                    p.expiration_date || p.entry_product?.expiration_date || "",
                };
              }) || [];

            // Actualizar selectedEntry con los datos formateados
            setSelectedEntry((prev) => ({
              ...prev,
              entry: formattedEntry,
              position: formattedPosition,
              bin_products: formattedProducts,
            }));
          }
        }
      } else if (modalMode === "create" || modalMode === "edit") {
        loadInitialData();

        // En modo edición, formatear los datos
        if (modalMode === "edit" && selectedEntry) {
          if (selectedEntry.entry?.id) {
            const formattedEntry = {
              ...selectedEntry.entry,
              value: selectedEntry.entry.id,
              label: selectedEntry.entry.code,
            };

            // Formatear productos para edición
            const formattedProducts =
              selectedEntry.bin_products?.map((p) => {
                if (!p.entry_product) {
                  return {
                    id: p.id,
                    product: null,
                    quantity: p.quantity || 0,
                    batch: p.batch || "",
                    expiration_date: p.expiration_date || "",
                  };
                }

                return {
                  id: p.id,
                  product: {
                    value: p.entry_product.id,
                    label:
                      p.entry_product.product?.name || "Producto sin nombre",
                    ...p.entry_product,
                  },
                  quantity: p.quantity,
                  batch: p.batch || p.entry_product?.batch || "",
                  expiration_date:
                    p.expiration_date || p.entry_product?.expiration_date || "",
                };
              }) || [];

            // Formatear posición si existe
            const formattedPosition = selectedEntry.position
              ? {
                  ...selectedEntry.position,
                  value: selectedEntry.position.id,
                  label: selectedEntry.position.code,
                }
              : null;

            // Actualizar selectedEntry con los datos formateados
            setSelectedEntry((prev) => ({
              ...prev,
              entry: formattedEntry,
              position: formattedPosition,
              bin_products: formattedProducts,
            }));
          }
        }
      }

      // Si no hay selectedEntry o es null, resetear el formulario
      if (!selectedEntry && modalMode === "create") {
        resetForm();
      }
    }
  }, [showModal, modalMode, selectedEntry?.id]);

  useEffect(() => {
    const loadInitialProducts = async () => {
      if (!isViewMode && selectedEntry?.entry?.id) {
        try {
          const response = await getEntryProducts(1, {
            entryId: selectedEntry.entry.id,
            is_completed: "false",
          });
          const formattedProducts = response.results.map((product) => ({
            value: product.id,
            label: product.product.name,
            ...product,
          }));
          setDefaultProducts(formattedProducts);
        } catch (error) {
          console.error("Error al cargar productos:", error);
          setDefaultProducts([]);
        }
      }
    };

    loadInitialProducts();
  }, [selectedEntry?.entry, isViewMode]);

  useEffect(() => {
    if (errorResponse && errorResponse.quantity) {
      const updatedErrors = { ...validationErrors };

      if (selectedEntry?.bin_products) {
        selectedEntry.bin_products.forEach((product, index) => {
          if (!updatedErrors.products[index]) {
            updatedErrors.products[index] = {};
          }
          updatedErrors.products[index].quantity = errorResponse.quantity[0];
        });
      }

      setValidationErrors(updatedErrors);
    }
  }, [errorResponse]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const entriesData = await getEntries(1, {
        status: "pendiente,en_progreso",
      });

      setDefaultEntries(
        (entriesData.results || []).map((entry) => ({
          value: entry.id,
          label: entry.code,
          ...entry,
        }))
      );
    } catch (error) {
      console.error("Error al cargar los datos:", error);
      setDefaultEntries([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setSelectedEntry((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (index, field, value) => {
    setSelectedEntry((prev) => {
      const updatedProducts = [...prev.bin_products];

      if (field === "product") {
        if (value) {
          updatedProducts[index] = {
            ...updatedProducts[index],
            product: value,
            quantity: 0,
            batch: value.batch || "",
            expiration_date: value.expiration_date || "",
          };
        } else {
          updatedProducts[index] = {
            ...updatedProducts[index],
            product: null,
            quantity: 0,
            batch: "",
            expiration_date: "",
          };
        }
      } else {
        updatedProducts[index] = { ...updatedProducts[index], [field]: value };
      }

      return {
        ...prev,
        bin_products: updatedProducts,
      };
    });
  };

  const handleSaveClick = async (event) => {
    if (event) {
      event.preventDefault();
    }

    setValidationErrors({
      entry: null,
      status: null,
      products: {},
      quantity: null,
    });

    setBackendErrors(null);

    const errors = {
      entry: null,
      status: null,
      products: {},
      quantity: null,
    };

    let hasErrors = false;

    if (!selectedEntry.entry) {
      errors.entry = "La orden de entrada es requerida";
      hasErrors = true;
    }

    const productErrors = {};

    selectedEntry.bin_products.forEach((product, index) => {
      const currentProductErrors = {};

      if (!product?.product?.value) {
        currentProductErrors.product = "Debe seleccionar un producto";
        hasErrors = true;
      }

      if (!product.quantity || product.quantity <= 0) {
        currentProductErrors.quantity = "La cantidad debe ser mayor a 0";
        hasErrors = true;
      }

      if (
        isCreateMode &&
        product.product.in_inventory + product.quantity >
          product.product.real_quantity
      ) {
        currentProductErrors.quantity = `Excede la cantidad disponible (${
          product.product.real_quantity - product.product.in_inventory
        })`;
        hasErrors = true;
      }

      if (Object.keys(currentProductErrors).length > 0) {
        productErrors[index] = currentProductErrors;
      }
    });

    errors.products = productErrors;

    setValidationErrors(errors);

    if (hasErrors) {
      return;
    }

    try {
      await handleSaveEntry(selectedEntry, productsToDelete);
      setProductsToDelete([]);
    } catch (error) {
      console.error("Error al guardar:", error);
      setBackendErrors("Ocurrió un error al guardar. Intente nuevamente.");
    }
  };

  const resetForm = () => {
    // Solo resetear la entrada si estamos en modo de creación
    if (modalMode === "create") {
      setSelectedEntry({
        entry: null,
        status: "en_recibo",
        is_active: true,
        position: null,
        bin_products: [
          {
            tempId: Date.now(),
            product: null,
            quantity: 0,
            batch: "",
            expiration_date: "",
          },
        ],
      });
    }

    setValidationErrors({
      entry: null,
      status: null,
      products: {},
    });

    setBackendErrors(null);
    setProductsToDelete([]);
    setDefaultProducts([]);
    setIsLoadingProducts(false);
  };

  const loadEntryOptions = async (inputValue) => {
    if (isViewMode) return [];

    try {
      const response = await getEntries(
        1,
        {
          status: "pendiente,en_progreso",
        },
        inputValue
      );
      return response.results.map((entry) => ({
        value: entry.id,
        label: entry.code,
        ...entry,
      }));
    } catch (error) {
      console.error("Error al buscar entradas:", error);
      return [];
    }
  };

  const loadProductOptions = async (inputValue) => {
    if (isViewMode || !selectedEntry?.entry?.id) return [];

    try {
      setIsLoadingProducts(true);
      const response = await getEntryProducts(
        1,
        {
          entryId: selectedEntry.entry.id,
          is_completed: "false",
        },
        inputValue
      );

      return (response.results || [])
        .map((product) => {
          if (!product || !product.product) {
            return null;
          }

          const expDate = product.expiration_date
            ? new Date(product.expiration_date).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "Sin fecha";

          const label = `${product.product.name} / ${expDate} / ${
            product.quantity || 0
          } cajas`;

          return {
            value: product.id,
            label: label,
            product: {
              id: product.product.id,
              name: product.product.name || "Producto sin nombre",
            },
            quantity: product.quantity || 0,
            available_quantity: product.quantity || 0,
            expiration_date: product.expiration_date,
            batch: product.batch,
            ...product,
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error("Error al buscar productos:", error);
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadPositionsOptions = async (inputValue) => {
    if (isViewMode) return [];

    try {
      const response = await getPositions(
        1,
        { status: "libre", page_size: 100 },
        inputValue
      );

      return (response.results || []).map((position) => ({
        value: position.id,
        label: position.code,
        ...position,
      }));
    } catch (error) {
      console.error("Error al buscar posiciones:", error);
      return [];
    }
  };

  const handleCloseModalWithReset = () => {
    handleCloseModal();
    resetForm();
  };

  const handlePrintTag = async () => {
    if (!selectedEntry?.id || isPrinting) return;

    setIsPrinting(true);
    try {
      await printBinTag(selectedEntry.id);
      // Opcional: mostrar mensaje de éxito
    } catch (error) {
      console.error("Error al imprimir etiqueta:", error);
      // Opcional: mostrar mensaje de error
    } finally {
      setIsPrinting(false);
    }
  };

  const handleRegenerateTag = async () => {
    if (!selectedEntry?.id || isRegenerating) return;

    setIsRegenerating(true);
    setBackendErrors(null);
    try {
      const response = await regenerateBinTag(selectedEntry.id);
      if (response?.tag_image) {
        setSelectedEntry((prev) => ({
          ...prev,
          tag_image: response.tag_image,
        }));
      }
    } catch (error) {
      setBackendErrors(
        getApiErrorMessage(error, "No se pudo regenerar la etiqueta."),
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const modalTitle = isViewMode
            ? "Ver bin"
            : selectedEntry?.id
            ? "Modificar bin"
      : "Nuevo bin";

  const binDetailsForm = (
          <Form onSubmit={(e) => e.preventDefault()}>
            <Modal.Section title="Datos generales" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={6} className="mb-0">
                <Form.Group controlId="entry-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Orden de entrada <span className="text-danger">*</span>
                        </Form.Label>
                        <AsyncSelect
                          inputId="entry-select"
                          name="entry"
                          value={selectedEntry?.entry ?? null}
                          loadOptions={loadEntryOptions}
                          defaultOptions={defaultEntries}
                    isDisabled={isViewMode || !isCreateMode}
                          isLoading={isLoadingData}
                          onChange={(selected) => {
                      if (isViewMode) return;
                      handleChange("entry", selected);

                      // Resetear a un solo producto vacío
                      setSelectedEntry((prev) => ({
                        ...prev,
                        is_active: prev.is_active !== false,
                        bin_products: [
                          {
                            tempId: Date.now(),
                            product: null,
                            quantity: 0,
                            batch: "",
                            expiration_date: "",
                          },
                        ],
                      }));

                      setValidationErrors((prev) => ({ ...prev, entry: null }));
                    }}
                    placeholder={
                      isLoadingData
                        ? "Cargando órdenes..."
                        : "Seleccione una orden"
                    }
                    isClearable={!isViewMode}
                    noOptionsMessage={({ inputValue }) =>
                      inputValue
                        ? "No hay resultados para su búsqueda"
                        : "Escriba para buscar"
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: validationErrors.entry
                          ? "#dc3545"
                          : base.borderColor,
                        boxShadow: validationErrors.entry
                          ? "0 0 0 0.25rem rgba(220, 53, 69, 0.25)"
                          : base.boxShadow,
                      }),
                    }}
                  />
                  {validationErrors.entry && (
                    <Form.Text className="text-danger">
                      {validationErrors.entry}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="status-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Estado</Form.Label>
                  <Form.Select
                    name="status"
                    value={selectedEntry?.status || ""}
                    onChange={(e) => {
                      // Solo permitir cambiar a "en_recibo", otros estados son solo lectura
                      if (e.target.value === "en_recibo" || isViewMode) {
                        handleChange("status", e.target.value);
                        setValidationErrors((prev) => ({
                          ...prev,
                          status: null,
                        }));
                      }
                    }}
                    disabled={isViewMode}
                    required
                    isInvalid={!!validationErrors.status}
                  >
                    <option value="">Seleccione un estado</option>
                    {Object.entries(statusLabels).map(([value, label]) => {
                      const isSelectableStatus = value === "en_recibo";
                      const isCurrentStatus = selectedEntry?.status === value;
                      const isDisabledOption =
                        !isViewMode && !isSelectableStatus && !isCurrentStatus;
                      const statusHelpText =
                        'Solo se puede cambiar manualmente a "En Recibo". Los otros estados se actualizan automáticamente por el sistema.';

                      return (
                        <option
                          key={value}
                          value={value}
                          disabled={isDisabledOption}
                          title={isDisabledOption ? statusHelpText : undefined}
                        >
                          {label}
                        </option>
                      );
                    })}
                  </Form.Select>
                  {validationErrors.status && (
                    <Form.Text className="text-danger">
                      {validationErrors.status}
                    </Form.Text>
                  )}
                  {!isViewMode && (
                    <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500">
                      Solo se puede cambiar manualmente a{" "}
                      <span className="font-medium text-slate-700">En Recibo</span>. Los otros
                      estados se actualizan automáticamente por el sistema.
                    </Form.Text>
                  )}
                </Form.Group>
                {selectedEntry?.dispatched_date && (
                  <div className="text-muted fs-12">
                    La orden fue despachada el{" "}
                    {formatDate(selectedEntry.dispatched_date)}
                  </div>
                )}
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="position-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Posición</Form.Label>
                  <AsyncSelect
                    inputId="position-select"
                    name="position"
                    value={selectedEntry?.position ?? null}
                    loadOptions={loadPositionsOptions}
                    isDisabled={isViewMode}
                    isLoading={isLoadingData}
                    onChange={(selected) => {
                      handleChange("position", selected);
                    }}
                    placeholder={
                      isLoadingData
                        ? "Cargando posiciones..."
                        : isViewMode
                          ? "Sin posición asignada"
                        : "Seleccione una posición libre"
                    }
                    isClearable={!isViewMode}
                    noOptionsMessage={({ inputValue }) =>
                      inputValue
                        ? "No hay posiciones libres para su búsqueda"
                        : "Escriba para buscar posiciones libres"
                    }
                    cacheOptions={false}
                    defaultOptions={
                      isViewMode && selectedEntry?.position
                        ? [selectedEntry.position]
                        : true
                    }
                  />
                  {!isViewMode && (
                    <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500">
                      Solo se muestran posiciones con estado{" "}
                      <span className="font-medium text-slate-700">Libre</span>
                  </Form.Text>
                  )}
                  {validationErrors.position && (
                    <Form.Text className="text-danger">
                      {validationErrors.position}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="is-active-check" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Estado del bin</Form.Label>
                  <Form.Check
                    type="checkbox"
                    id="is-active-checkbox"
                    label="¿Activo?"
                    checked={selectedEntry?.is_active !== false}
                    onChange={(e) => {
                      handleChange("is_active", e.target.checked);
                    }}
                    disabled={isViewMode}
                  />
                  <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500">
                    Los bins inactivos no se pueden usar para órdenes de salida
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="lpn-input" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">LPN</Form.Label>
                  <Form.Control
                    name="lpn"
                    value={selectedEntry?.lpn || ""}
                    onChange={(e) => handleChange("lpn", e.target.value)}
                    disabled={isViewMode}
                    placeholder="LPN"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="barcode-input" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Código de barra
                  </Form.Label>
                  <Form.Control
                    name="barcode"
                    value={selectedEntry?.barcode || ""}
                    onChange={(e) => handleChange("barcode", e.target.value)}
                    disabled={isViewMode}
                    placeholder="Código de barra"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} className="mb-0">
                <Form.Group controlId="observation-input" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Observación
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="observation"
                    value={selectedEntry?.observation || ""}
                    onChange={(e) => handleChange("observation", e.target.value)}
                    disabled={isViewMode}
                    placeholder="Observación"
                  />
                </Form.Group>
              </Col>

              {selectedEntry?.related_exits?.length > 0 && (
                <Col xs={12} className="mb-0">
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Órdenes de salida relacionadas
                    </Form.Label>
                    <VisibleSliceList
                      items={selectedEntry.related_exits}
                      itemLabel="órdenes"
                      className="flex flex-wrap gap-2"
                    >
                      {(visibleExits) =>
                        visibleExits.map((exit) => (
                          <Badge
                            key={exit.exit_id}
                            bg="info"
                            className="cursor-pointer !px-2.5 !py-1.5 text-sm"
                            onClick={() =>
                              navigate(
                                `/order/exits?exit_code=${exit.exit_code}`,
                              )
                            }
                            title={`Ver orden de salida: ${exit.exit_code}`}
                          >
                            {exit.exit_code}
                            <ExternalLink className="ms-1 inline h-3.5 w-3.5" />
                          </Badge>
                        ))
                      }
                    </VisibleSliceList>
                            </Form.Group>
                </Col>
              )}
            </Row>
            </Modal.Section>

            <Modal.Section title="Producto del bin" className="!p-3.5">
              <BinProductLines
                selectedEntry={selectedEntry}
                isViewMode={isViewMode}
                isCreateMode={isCreateMode}
                defaultProducts={defaultProducts}
                isLoadingProducts={isLoadingProducts}
                validationErrors={validationErrors}
                loadProductOptions={loadProductOptions}
                handleProductChange={handleProductChange}
                setValidationErrors={setValidationErrors}
              />
            </Modal.Section>
            {selectedEntry?.tag_image && (
              <Modal.Section title="Etiqueta del bin" className="!p-3.5">
                <div className="mb-3 flex justify-end gap-2">
                  <IconButton
                    variant="ghost"
                        size="sm"
                    className="h-8 w-8 text-sky-600 hover:bg-sky-50"
                        onClick={handlePrintTag}
                        disabled={isPrinting || !selectedEntry?.id}
                        title="Imprimir etiqueta"
                    aria-label="Imprimir etiqueta"
                      >
                        {isPrinting ? (
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                      />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                  </IconButton>
                  <IconButton
                    variant="ghost"
                        size="sm"
                    className="h-8 w-8 text-sky-600 hover:bg-sky-50"
                        onClick={handleRegenerateTag}
                        disabled={isRegenerating || !selectedEntry?.id}
                        title="Regenerar etiqueta"
                    aria-label="Regenerar etiqueta"
                      >
                        {isRegenerating ? (
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                      />
                        ) : (
                      <RefreshCw className="h-4 w-4" />
                        )}
                  </IconButton>
                    </div>
                <div className="text-center">
                      <a
                        href={selectedEntry.tag_image}
                        target="_blank"
                        rel="noopener noreferrer"
                    className="inline-block"
                      >
                        <img
                          src={selectedEntry.tag_image}
                      alt="Etiqueta del bin"
                      className="mx-auto max-h-[400px] w-auto rounded-md border border-[var(--border-subtle)] object-contain"
                        />
                      </a>
                    </div>
              </Modal.Section>
            )}
          </Form>
  );

  return (
    <Modal show={showModal} onHide={handleCloseModalWithReset} size="full">
      <Modal.Header closeButton>
        <div>
          <Modal.Title>{modalTitle}</Modal.Title>
          {selectedEntry?.code ? (
            <Modal.Subtitle>
              Código:{" "}
              <span className="font-medium text-[var(--foreground)]">{selectedEntry.code}</span>
              {selectedEntry?.status ? (
                <Badge bg="primary" className="ms-2 align-middle">
                  {statusLabels[selectedEntry.status] || selectedEntry.status}
                </Badge>
              ) : null}
            </Modal.Subtitle>
          ) : (
            <Modal.Subtitle>Complete los datos para registrar un nuevo bin.</Modal.Subtitle>
          )}
        </div>
      </Modal.Header>
      <Modal.Body>
        {backendErrors && (
          <div className="alert alert-danger mb-3">{backendErrors}</div>
        )}

        {isViewMode && selectedEntry?.id ? (
          <Tabs activeKey={activeTab} onSelect={setActiveTab} id="bin-tabs">
            <Tab eventKey="details" title="Detalles">
              <div className="pt-1">{binDetailsForm}</div>
            </Tab>
            <Tab eventKey="movements" title="Historial de Movimientos">
              <div className="pt-3">
                <BinMovementsTimeline binId={selectedEntry.id} />
              </div>
            </Tab>
          </Tabs>
        ) : (
          binDetailsForm
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={handleCloseModalWithReset} disabled={isSaving}>
          Cerrar
        </Button>
        {!isViewMode && (
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSaveClick}
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ModalEdit;
