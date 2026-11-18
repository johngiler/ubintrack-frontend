"use client";

import { ChevronDown, FileText, Plus, Save, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Modal, Button, Form, Row, Col, Badge, Alert } from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import ModalTabList from "@/components/ui/ModalTabList";
import AsyncSelect from "@/components/ui/AsyncSelect";
import Select from "@/components/ui/Select";
import EntryProductLines from "./EntryProductLines";
import EntryMovementsTimeline from "./EntryMovementsTimeline";
import { useState, useEffect, useMemo } from "react";
import { getProducts } from "@/services/inventoryService";
import { regenerateEntryPdf } from "@/services/orderService";
import { useAuth } from "@/context/AuthContext";
import { getClients } from "@/services/coreService";
import { getStorages } from "@/services/storageService";

const EXTRA_FIELD_TYPE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "check", label: "Check" },
  { value: "texto", label: "Texto" },
];

const ModalEdit = ({
  showModal,
  handleCloseModal,
  modalMode,
  selectedEntry,
  setSelectedEntry,
  isSaving,
  handleSaveEntry,
  statusLabels,
  conditionLabels,
  inTypeLabels,
  showAlert,
  initialTab = "details",
}) => {
  const isViewMode = modalMode === "view";
  const isCreateMode = modalMode === "create";
  const user = useAuth().user;
  const isClientUser = !!user?.client && !user?.is_superuser;

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [storages, setStorages] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isRegeneratingPdf, setIsRegeneratingPdf] = useState(false);
  const [pdfAlert, setPdfAlert] = useState({ show: false, variant: "", message: "" });
  const [activeTab, setActiveTab] = useState(initialTab || "details");
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [newImagePreviews, setNewImagePreviews] = useState([]);

  useEffect(() => {
    if (showModal) {
      setActiveTab(initialTab || "details");
      setExtrasOpen(false);
    }
  }, [showModal, initialTab]);

  const [validationErrors, setValidationErrors] = useState({
    client: null,
    in_type: null,
    products: {},
  });

  useEffect(() => {
    if (showModal) {
      if (modalMode === "view") {
        if (selectedEntry) {
          if (selectedEntry.storage) {
            setStorages([selectedEntry.storage]);
          }

          if (selectedEntry.entry_products) {
            const entryProducts = selectedEntry.entry_products.map(
              (ep) => ep.product
            );
            setProducts(entryProducts);
          }
        }
      } else if (modalMode === "create" || modalMode === "edit") {
        loadClientsAndStorages();
        if (isClientUser) {
          setSelectedEntry((prev) => ({ ...prev, client: user.client }));
        }

        if (selectedEntry?.client?.id) {
          loadProductsForClient(selectedEntry.client.id);
        }
      }
    } else {
      setClients([]);
      setProducts([]);
      setStorages([]);
      setIsLoadingData(false);
      setIsLoadingProducts(false);
      setProductsToDelete([]);
      setNewImagePreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      setExtrasOpen(false);
    }
    setValidationErrors({
      client: null,
      in_type: null,
      products: {},
    });
  }, [showModal, modalMode]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviews]);

  useEffect(() => {
    if (!!storages[0]) {
      setSelectedEntry((prev) => ({
        ...prev,
        storage: storages[0],
      }));
    }
  }, [storages]);

  // Cargar productos cuando cambia el cliente o la condición
  useEffect(() => {
    if (selectedEntry?.client?.id) {
      loadProductsForClient(
        selectedEntry.client.id,
        "",
        selectedEntry?.condition
      );
    } else {
      setProducts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntry?.client?.id, selectedEntry?.condition]);

  const loadClientsAndStorages = async () => {
    setIsLoadingData(true);
    try {
      // Para usuario cliente, no consultamos /api/clients; usamos su cliente
      if (isClientUser) {
        setClients([user.client]);
      } else {
        const clientsData = await getClients();
        setClients(clientsData.results || []);
      }

      const storagesData = await getStorages();
      setStorages(storagesData.results || []);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      if (!isClientUser) setClients([]);
      setStorages([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProductsForClient = async (clientId, inputValue, condition) => {
    setIsLoadingProducts(true);
    try {
      const filters = { client: clientId };
      if (condition) {
        filters.condition = condition;
      }
      const productsData = await getProducts(1, filters, inputValue);
      setProducts(productsData.results || []);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadClientOptions = async (inputValue) => {
    try {
      if (isClientUser) return [];
      const response = await getClients(1, inputValue);
      return response.results.map((client) => ({
        value: client.id,
        label: client.name,
        ...client,
      }));
    } catch (error) {
      console.error("Error al buscar clientes:", error);
      return [];
    }
  };

  const loadProductOptions = async (inputValue) => {
    if (!selectedEntry?.client?.id) return [];

    try {
      const filters = { client: selectedEntry.client.id };
      if (selectedEntry?.condition) {
        filters.condition = selectedEntry.condition;
      }
      const response = await getProducts(1, filters, inputValue);
      return response.results.map((product) => ({
        value: product.id,
        label: product.name,
        ...product,
      }));
    } catch (error) {
      console.error("Error al buscar productos:", error);
      return [];
    }
  };

  const handleAddProduct = () => {
    setSelectedEntry((prev) => ({
      ...prev,
      entry_products: [
        ...prev.entry_products,
        {
          product: null,
          quantity: 0,
          real_quantity: 0,
          batch: "",
          production_date: null,
          expiration_date: null,
        },
      ],
    }));
  };

  const handleRemoveProduct = (index) => {
    setSelectedEntry((prev) => {
      if (!prev.entry_products || prev.entry_products.length <= 1) {
        return prev;
      }

      const productToRemove = prev.entry_products[index];

      if (productToRemove.id) {
        setProductsToDelete((prevDelete) => [
          ...prevDelete,
          productToRemove.id,
        ]);
      }

      return {
        ...prev,
        entry_products: prev.entry_products.filter((_, i) => i !== index),
      };
    });
  };

  const handleProductChange = (index, field, value) => {
    setSelectedEntry((prev) => ({
      ...prev,
      entry_products: prev.entry_products.map((product, i) => {
        if (i === index) {
          if (field === "quantity") {
            return {
              ...product,
              [field]: value,
              real_quantity: value,
            };
          }
          return {
            ...product,
            [field]: value,
          };
        }
        return product;
      }),
    }));
  };

  const patchEntryDetail = (patch) => {
    setSelectedEntry((prev) => ({
      ...prev,
      entry_detail: {
        ...(prev.entry_detail || {}),
        ...patch,
      },
    }));
  };

  const handleChange = (field, value) => {
    setSelectedEntry((prev) => {
      if (
        field === "arrival_temperature" ||
        field === "description" ||
        field === "include_images_in_pdf"
      ) {
        return {
          ...prev,
          entry_detail: {
            ...(prev.entry_detail || {}),
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const existingImages = useMemo(() => {
    const detail = selectedEntry?.entry_detail || {};
    const fromGallery = Array.isArray(detail.images) ? detail.images : [];
    if (fromGallery.length) return fromGallery;
    if (typeof detail.image === "string" && detail.image) {
      return [{ id: "legacy", image: detail.image, sort_order: 0 }];
    }
    return [];
  }, [selectedEntry?.entry_detail]);

  const newImages = Array.isArray(selectedEntry?.entry_detail?.new_images)
    ? selectedEntry.entry_detail.new_images
    : [];
  const hasAnyImage = existingImages.length > 0 || newImages.length > 0;
  const extraFields = Array.isArray(selectedEntry?.entry_detail?.extra_fields)
    ? selectedEntry.entry_detail.extra_fields
    : [];
  const showExtrasSection =
    !isViewMode || extraFields.some((row) => String(row?.name || "").trim());

  const handleAddImages = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f instanceof File);
    if (!files.length) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewImagePreviews((prev) => [...prev, ...urls]);
    patchEntryDetail({
      new_images: [...newImages, ...files],
    });
  };

  const handleRemoveNewImage = (index) => {
    const url = newImagePreviews[index];
    if (url) URL.revokeObjectURL(url);
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
    const nextFiles = newImages.filter((_, i) => i !== index);
    const nextHas =
      existingImages.length > 0 || nextFiles.length > 0;
    patchEntryDetail({
      new_images: nextFiles,
      include_images_in_pdf: nextHas
        ? selectedEntry?.entry_detail?.include_images_in_pdf
        : false,
    });
  };

  const handleRemoveExistingImage = (img) => {
    if (img.id === "legacy") {
      patchEntryDetail({
        image: null,
        images: [],
        include_images_in_pdf:
          newImages.length > 0
            ? selectedEntry?.entry_detail?.include_images_in_pdf
            : false,
      });
      return;
    }
    const nextGallery = existingImages.filter((row) => row.id !== img.id);
    const deleteIds = [
      ...(selectedEntry?.entry_detail?.delete_image_ids || []),
      img.id,
    ];
    const nextHas = nextGallery.length > 0 || newImages.length > 0;
    patchEntryDetail({
      images: nextGallery,
      delete_image_ids: deleteIds,
      include_images_in_pdf: nextHas
        ? selectedEntry?.entry_detail?.include_images_in_pdf
        : false,
    });
  };

  const handleAddExtraField = () => {
    patchEntryDetail({
      extra_fields: [
        ...extraFields,
        { name: "", type: "normal", value: "" },
      ],
    });
    setExtrasOpen(true);
  };

  const handleExtraFieldChange = (index, key, value) => {
    const next = extraFields.map((row, i) => {
      if (i !== index) return row;
      if (key === "type") {
        const nextType = value || "normal";
        let nextValue = row.value;
        if (nextType === "check") {
          nextValue = Boolean(row.value === true || row.value === "true");
        } else if (row.type === "check") {
          nextValue = "";
        }
        return { ...row, type: nextType, value: nextValue };
      }
      if (key === "value" && (row.type || "normal") === "normal") {
        return { ...row, value: String(value ?? "").slice(0, 60) };
      }
      if (key === "value" && row.type === "texto") {
        const lines = String(value ?? "").split("\n").slice(0, 6);
        return { ...row, value: lines.join("\n") };
      }
      return { ...row, [key]: value };
    });
    patchEntryDetail({ extra_fields: next });
  };

  const handleRemoveExtraField = (index) => {
    patchEntryDetail({
      extra_fields: extraFields.filter((_, i) => i !== index),
    });
  };

  const getEntryDetailValue = (field, defaultValue = "") => {
    const raw = selectedEntry.entry_detail?.[field];
    if (raw == null) return defaultValue;
    return typeof raw === "number" ? String(raw) : raw;
  };

  const handleSaveClick = async () => {
    const errors = {
      client: null,
      in_type: null,
      products: {},
    };

    let hasErrors = false;

    if (!selectedEntry.client) {
      errors.client = "El cliente es obligatorio";
      hasErrors = true;
    }

    if (!selectedEntry.in_type) {
      errors.in_type = "El tipo de entrada es obligatorio";
      hasErrors = true;
    }

    if (
      selectedEntry.entry_products &&
      selectedEntry.entry_products.length > 0
    ) {
      selectedEntry.entry_products.forEach((product, index) => {
        const productErrors = {};

        if (!product.product) {
          productErrors.product = "El producto es obligatorio";
          hasErrors = true;
        }

        if (!product.quantity || product.quantity <= 0) {
          productErrors.quantity = "La cantidad debe ser mayor a 0";
          hasErrors = true;
        }

        if (!product.real_quantity || product.real_quantity < 0) {
          productErrors.real_quantity =
            "La cantidad real no puede ser negativa";
          hasErrors = true;
        }

        if (Object.keys(productErrors).length > 0) {
          errors.products[index] = productErrors;
        }
      });
    } else {
      errors.products.general = "Debe agregar al menos un producto";
      hasErrors = true;
    }

    setValidationErrors(errors);

    if (!hasErrors) {
      await handleSaveEntry(selectedEntry, productsToDelete);
      setProductsToDelete([]);
    }
  };

  const modalTitle = isViewMode
    ? "Ver orden de entrada"
    : selectedEntry?.id
      ? "Modificar orden de entrada"
      : "Nueva orden de entrada";

  return (
    <Modal show={showModal} onHide={handleCloseModal} size="full">
      <Modal.Header closeButton>
        <div>
          <Modal.Title>{modalTitle}</Modal.Title>
          {selectedEntry?.code ? (
            <Modal.Subtitle>
              Código: <span className="font-medium text-[var(--foreground)]">{selectedEntry.code}</span>
              {selectedEntry?.status ? (
                <Badge bg="primary" className="ms-2 align-middle">
                  {statusLabels[selectedEntry.status] || selectedEntry.status}
                </Badge>
              ) : null}
            </Modal.Subtitle>
          ) : (
            <Modal.Subtitle>Complete los datos para registrar una nueva entrada.</Modal.Subtitle>
          )}
        </div>
      </Modal.Header>
      {selectedEntry?.id ? (
        <ModalTabList
          activeKey={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: "details", title: "Detalles" },
            { key: "movements", title: "Historial de movimientos" },
          ]}
        />
      ) : null}
      <Modal.Body>
        {selectedEntry?.id && activeTab === "movements" ? (
          <EntryMovementsTimeline
            entryId={selectedEntry.id}
            active={activeTab === "movements"}
          />
        ) : (
        <>
        {selectedEntry && (
          <Form onSubmit={(e) => e.preventDefault()}>
            <Modal.Section title="Datos generales" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={6} className="mb-0">
                <Form.Group controlId="client-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Cliente <span className="text-danger">*</span>
                  </Form.Label>
                  <AsyncSelect
                    inputId="client-select"
                    name="client"
                    value={
                      selectedEntry.client
                        ? {
                            value: selectedEntry.client.id,
                            label: selectedEntry.client.name,
                            ...selectedEntry.client,
                          }
                        : null
                    }
                    loadOptions={loadClientOptions}
                    defaultOptions={clients.map((client) => ({
                      value: client.id,
                      label: client.name,
                      ...client,
                    }))}
                    isDisabled={!isCreateMode || isClientUser}
                    isLoading={isLoadingData}
                    onChange={(selected) => {
                      handleChange(
                        "client",
                        selected
                          ? {
                              id: selected.value,
                              name: selected.label,
                            }
                          : null
                      );
                      if (selected) {
                        loadProductsForClient(selected.value);
                      } else {
                        setProducts([]);
                      }

                      setSelectedEntry((prev) => ({
                        ...prev,
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
                      }));

                      setValidationErrors((prev) => ({
                        ...prev,
                        client: null,
                      }));
                    }}
                    placeholder={
                      isLoadingData
                        ? "Cargando clientes..."
                        : "Seleccione un cliente"
                    }
                    isClearable
                    noOptionsMessage={({ inputValue }) =>
                      inputValue ? "No hay resultados" : "Escriba para buscar"
                    }
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                      control: (base) => ({
                        ...base,
                        borderColor: validationErrors.client
                          ? "#dc3545"
                          : base.borderColor,
                        boxShadow: validationErrors.client
                          ? "0 0 0 0.25rem rgba(220, 53, 69, 0.25)"
                          : base.boxShadow,
                      }),
                    }}
                  />
                  {validationErrors.client && (
                    <Form.Text className="text-danger">
                      {validationErrors.client}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="status-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Estado</Form.Label>
                  <Form.Select
                    name="status"
                    value={selectedEntry.status || ""}
                    disabled={isViewMode || isClientUser}
                    onChange={(e) => {
                      // Solo permitir cambiar a "pendiente" y "cancelada", otros estados son solo lectura
                      if (
                        e.target.value === "pendiente" ||
                        e.target.value === "cancelada" ||
                        isViewMode
                      ) {
                        handleChange("status", e.target.value);
                        setValidationErrors((prev) => ({
                          ...prev,
                          status: null,
                        }));
                      }
                    }}
                    isInvalid={!!validationErrors.status}
                  >
                    <option value="">Seleccione un estado</option>
                    {Object.entries(statusLabels).map(([value, label]) => {
                      const isSelectableStatus =
                        value === "pendiente" || value === "cancelada";
                      const isCurrentStatus = selectedEntry?.status === value;
                      const isDisabledOption =
                        !isViewMode && !isSelectableStatus && !isCurrentStatus;
                      const statusHelpText =
                        'Solo se puede cambiar manualmente a "Pendiente" y "Cancelada". Los otros estados se actualizan automáticamente por el sistema.';

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
                  {!isViewMode && !isClientUser && (
                    <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500">
                      Solo se puede cambiar manualmente a{" "}
                      <span className="font-medium text-slate-700">Pendiente</span> y{" "}
                      <span className="font-medium text-slate-700">Cancelada</span>. Los otros
                      estados se actualizan automáticamente por el sistema.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="storage-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Almacén</Form.Label>
                  <Form.Select
                    name="storage"
                    value={selectedEntry.storage?.id || ""}
                    disabled={isViewMode || isLoadingData}
                    onChange={(e) => {
                      const storageId = parseInt(e.target.value);
                      const storage = storages.find((s) => s.id === storageId);
                      handleChange("storage", storage || null);
                      setValidationErrors((prev) => ({
                        ...prev,
                        storage: null,
                      }));
                    }}
                    isInvalid={!!validationErrors.storage}
                  >
                    <option value="">Seleccione un almacén</option>
                    {storages.map((storage) => (
                      <option key={storage.id} value={storage.id}>
                        {storage.name}
                      </option>
                    ))}
                  </Form.Select>
                  {validationErrors.storage && (
                    <Form.Text className="text-danger">
                      {validationErrors.storage}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="condition-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Condición</Form.Label>
                  <Form.Select
                    name="condition"
                    value={selectedEntry.condition || ""}
                    disabled={isViewMode}
                    onChange={(e) => {
                      const newCondition = e.target.value;
                      const isCompleted =
                        selectedEntry?.status === "completada";
                      handleChange("condition", newCondition);
                      setValidationErrors((prev) => ({
                        ...prev,
                        condition: null,
                      }));
                      // En completada no se tocan productos (bins ya existen).
                      if (isCompleted) return;
                      setSelectedEntry((prev) => ({
                        ...prev,
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
                      }));
                    }}
                    isInvalid={!!validationErrors.condition}
                  >
                    <option value="">Seleccione una condición</option>
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Form.Select>
                  {validationErrors.condition && (
                    <Form.Text className="text-danger">
                      {validationErrors.condition}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="in_type-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Tipo de entrada <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="in_type"
                    value={selectedEntry.in_type || ""}
                    disabled={isViewMode}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const binsCount = selectedEntry.bins_count || 0;
                      const isCompleted =
                        selectedEntry?.status === "completada";

                      // En completada solo cambia el flag (no resetear servicios).
                      if (isCompleted) {
                        setSelectedEntry((prev) => ({
                          ...prev,
                          in_type: newType,
                        }));
                      } else if (newType.toLowerCase() === "piso") {
                        setSelectedEntry((prev) => ({
                          ...prev,
                          in_type: newType,
                          total_restibas: binsCount,
                          total_wraps: binsCount,
                          total_added_pallets: binsCount,
                        }));
                      } else {
                        setSelectedEntry((prev) => ({
                          ...prev,
                          in_type: newType,
                          total_restibas: 0,
                          total_wraps: 0,
                          total_added_pallets: 0,
                        }));
                      }

                      setValidationErrors((prev) => ({
                        ...prev,
                        in_type: null,
                      }));
                    }}
                    isInvalid={!!validationErrors.in_type}
                  >
                    <option value="">Seleccione un tipo de entrada</option>
                    {Object.entries(inTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Form.Select>
                  {validationErrors.in_type && (
                    <Form.Text className="text-danger">
                      {validationErrors.in_type}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6} className="mb-0">
                <Form.Group controlId="entry_date-input" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Fecha de entrada</Form.Label>
                  <Form.Control
                    name="entry_date"
                    type="date"
                    value={selectedEntry.entry_date || ""}
                    disabled={isViewMode}
                    onChange={(e) => {
                      handleChange("entry_date", e.target.value);
                      setValidationErrors((prev) => ({
                        ...prev,
                        entry_date: null,
                      }));
                    }}
                    isInvalid={!!validationErrors.entry_date}
                  />
                  {validationErrors.entry_date && (
                    <Form.Text className="text-danger">
                      {validationErrors.entry_date}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>
            </Modal.Section>

            {/* Campos de servicios - solo en edit y view */}
            {!isCreateMode &&
              (() => {
                const isPiso = selectedEntry.in_type?.toLowerCase() === "piso";
                const binsCount = selectedEntry.bins_count || 0;

                // Handler para Restiba (actualiza wrap y pallet automáticamente)
                const handleRestibaChange = (value) => {
                  const restiba = parseInt(value) || 0;
                  setSelectedEntry((prev) => ({
                    ...prev,
                    total_restibas: restiba,
                    total_wraps: restiba, // wrap = restiba
                    total_added_pallets: restiba, // pallet = restiba (pero editable)
                  }));
                };

                return (
                  <Modal.Section title="Servicios" className="!p-3.5">
                  <Row className="mb-0 gap-y-3">
                    <Col md={4} className="mb-0">
                      <Form.Group controlId="total_restibas-input" className="mb-0">
                        <Form.Label className="!text-xs !font-medium !text-slate-600">
                          Total restibas
                          {isPiso && (
                            <Badge bg="secondary" className="ms-2">
                              Auto
                            </Badge>
                          )}
                        </Form.Label>
                        <Form.Control
                          name="total_restibas"
                          type="number"
                          min="0"
                          value={String(selectedEntry.total_restibas ?? 0)}
                          disabled={isViewMode || isPiso}
                          className={isPiso ? "bg-light" : ""}
                          onChange={(e) => handleRestibaChange(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                          {isPiso
                            ? `= Total bins (${binsCount})`
                            : "Cantidad de restibas"}
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={4} className="mb-0">
                      <Form.Group controlId="total_wraps-input" className="mb-0">
                        <Form.Label className="!text-xs !font-medium !text-slate-600">
                          Total wrap/stretch
                          <Badge bg="secondary" className="ms-2">
                            Auto
                          </Badge>
                        </Form.Label>
                        <Form.Control
                          name="total_wraps"
                          type="number"
                          min="0"
                          value={String(selectedEntry.total_wraps ?? 0)}
                          disabled={true}
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          {isPiso
                            ? `= Total bins (${binsCount})`
                            : "= Restibas"}
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={4} className="mb-0">
                      <Form.Group controlId="total_added_pallets-input" className="mb-0">
                        <Form.Label className="!text-xs !font-medium !text-slate-600">
                          Pallets adicionales
                        </Form.Label>
                        <Form.Control
                          name="total_added_pallets"
                          type="number"
                          min="0"
                          value={String(selectedEntry.total_added_pallets ?? 0)}
                          disabled={isViewMode}
                          onChange={(e) =>
                            handleChange(
                              "total_added_pallets",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                        <Form.Text className="text-muted">
                          = Restiba (editable)
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  </Modal.Section>
                );
              })()}

            <Modal.Section title="Productos de la orden" className="!p-3.5">
              <EntryProductLines
                selectedEntry={selectedEntry}
                modalMode={modalMode}
                isViewMode={isViewMode}
                products={products}
                isLoadingProducts={isLoadingProducts}
                validationErrors={validationErrors}
                loadProductOptions={loadProductOptions}
                handleProductChange={handleProductChange}
                handleRemoveProduct={handleRemoveProduct}
                handleAddProduct={handleAddProduct}
                setValidationErrors={setValidationErrors}
              />
            </Modal.Section>

            <Modal.Section title="Detalle de la orden" className="!p-3.5">
              <div>
                <Row className="mb-0 gap-y-3">
                  <Col md={6} className="mb-0">
                    <Form.Group controlId="arrival_temperature-input" className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">
                        Temperatura de llegada
                      </Form.Label>
                      <Form.Control
                        name="arrival_temperature"
                        type="number"
                        value={getEntryDetailValue("arrival_temperature", "")}
                        disabled={isViewMode}
                        onChange={(e) =>
                          handleChange("arrival_temperature", e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-0 gap-y-3">
                  <Col md={12} className="mb-0">
                    <Form.Group controlId="description-textarea" className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">Descripción</Form.Label>
                      <Form.Control
                        name="description"
                        as="textarea"
                        rows={4}
                        value={getEntryDetailValue("description", "")}
                        disabled={isViewMode}
                        onChange={(e) =>
                          handleChange("description", e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="mt-3 space-y-3">
                  <div>
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Imágenes
                    </Form.Label>
                    {(existingImages.length > 0 || newImages.length > 0) && (
                      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {existingImages.map((img) => (
                          <div
                            key={img.id}
                            className="group relative overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-slate-50"
                          >
                            <img
                              src={img.image}
                              alt=""
                              className="h-28 w-full object-cover"
                            />
                            {!isViewMode && (
                              <button
                                type="button"
                                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/90 text-red-600 shadow-sm hover:bg-white"
                                onClick={() => handleRemoveExistingImage(img)}
                                title="Quitar imagen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {newImages.map((file, index) => (
                          <div
                            key={`new-${index}`}
                            className="group relative overflow-hidden rounded-lg border border-sky-200 bg-sky-50/40"
                          >
                            <img
                              src={newImagePreviews[index]}
                              alt={file.name}
                              className="h-28 w-full object-cover"
                            />
                            {!isViewMode && (
                              <button
                                type="button"
                                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/90 text-red-600 shadow-sm hover:bg-white"
                                onClick={() => handleRemoveNewImage(index)}
                                title="Quitar imagen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!isViewMode && (
                      <Form.Control
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          handleAddImages(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    )}
                  </div>

                  <Form.Check
                    type="checkbox"
                    id="include-images-in-pdf"
                    label="Incluir imágenes en el reporte"
                    checked={Boolean(
                      selectedEntry?.entry_detail?.include_images_in_pdf,
                    )}
                    disabled={isViewMode || !hasAnyImage}
                    onChange={(e) =>
                      handleChange("include_images_in_pdf", e.target.checked)
                    }
                    className="cursor-pointer text-sm"
                  />
                </div>

                {showExtrasSection ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between bg-[var(--surface-hover)]/40 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                      onClick={() => setExtrasOpen((o) => !o)}
                      aria-expanded={extrasOpen}
                    >
                      Campos extras
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          extrasOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {extrasOpen ? (
                        <motion.div
                          key="extras"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 p-3">
                            {extraFields.length === 0 && isViewMode ? (
                              <p className="mb-0 text-sm text-slate-500">
                                Sin campos extras
                              </p>
                            ) : null}
                            {extraFields.map((row, index) => {
                              const fieldType = row.type || "normal";
                              const isTexto = fieldType === "texto";
                              const isCheck = fieldType === "check";
                              return (
                              <div
                                key={`extra-${index}`}
                                className={`grid grid-cols-1 gap-2 ${
                                  isTexto ? "sm:grid-cols-1" : "sm:grid-cols-12"
                                }`}
                              >
                                <div className={isTexto ? "" : "sm:col-span-4"}>
                                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                                    Nombre de campo
                                  </Form.Label>
                                  <Form.Control
                                    size="sm"
                                    value={row.name || ""}
                                    disabled={isViewMode}
                                    onChange={(e) =>
                                      handleExtraFieldChange(
                                        index,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className={isTexto ? "" : "sm:col-span-3"}>
                                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                                    Tipo
                                  </Form.Label>
                                  <Select
                                    size="sm"
                                    isDisabled={isViewMode}
                                    options={EXTRA_FIELD_TYPE_OPTIONS}
                                    value={fieldType}
                                    onChange={(e) =>
                                      handleExtraFieldChange(
                                        index,
                                        "type",
                                        e.target.value || "normal",
                                      )
                                    }
                                  />
                                </div>
                                <div className={isTexto ? "" : "sm:col-span-4"}>
                                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                                    {isCheck ? "Marcado" : "Valor"}
                                  </Form.Label>
                                  {isCheck ? (
                                    <div className="flex h-9 items-center gap-2">
                                      <Form.Check
                                        type="checkbox"
                                        id={`extra-check-${index}`}
                                        checked={Boolean(row.value)}
                                        disabled={isViewMode}
                                        onChange={(e) =>
                                          handleExtraFieldChange(
                                            index,
                                            "value",
                                            e.target.checked,
                                          )
                                        }
                                        label={row.value ? "Sí" : "No"}
                                        className="cursor-pointer text-sm"
                                      />
                                    </div>
                                  ) : isTexto ? (
                                    <Form.Control
                                      size="sm"
                                      as="textarea"
                                      rows={6}
                                      value={row.value ?? ""}
                                      disabled={isViewMode}
                                      onChange={(e) =>
                                        handleExtraFieldChange(
                                          index,
                                          "value",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  ) : (
                                    <Form.Control
                                      size="sm"
                                      type="text"
                                      maxLength={60}
                                      value={row.value ?? ""}
                                      disabled={isViewMode}
                                      onChange={(e) =>
                                        handleExtraFieldChange(
                                          index,
                                          "value",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  )}
                                  {isTexto && !isViewMode ? (
                                    <div className="mt-2 flex justify-end">
                                      <IconButton
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50"
                                        onClick={() =>
                                          handleRemoveExtraField(index)
                                        }
                                        title="Quitar campo"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </IconButton>
                                    </div>
                                  ) : null}
                                </div>
                                {!isTexto && !isViewMode ? (
                                  <div className="flex items-end sm:col-span-1">
                                    <IconButton
                                      size="sm"
                                      className="mb-0.5 shrink-0 text-red-600 hover:bg-red-50"
                                      onClick={() =>
                                        handleRemoveExtraField(index)
                                      }
                                      title="Quitar campo"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                  </div>
                                ) : null}
                              </div>
                              );
                            })}
                            {!isViewMode ? (
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Plus}
                                  onClick={handleAddExtraField}
                                >
                                  Agregar campo
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}
              </div>
            </Modal.Section>
          </Form>
        )}
        {pdfAlert.show && (
          <Alert variant={pdfAlert.variant} className="mb-0 mt-3" dismissible onClose={() => setPdfAlert({ show: false, variant: "", message: "" })}>
            {pdfAlert.message}
          </Alert>
        )}
        </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={handleCloseModal}>
          Cerrar
        </Button>
        {!isCreateMode && selectedEntry?.id && selectedEntry.status === "completada" && (
          <Button
            variant="outline"
            icon={FileText}
            onClick={async () => {
              try {
                setIsRegeneratingPdf(true);
                setPdfAlert({ show: false, variant: "", message: "" });
                await regenerateEntryPdf(selectedEntry.id);
                setPdfAlert({ show: true, variant: "success", message: "PDF regenerado exitosamente" });
                setTimeout(() => setPdfAlert({ show: false, variant: "", message: "" }), 3000);
              } catch (error) {
                console.error("Error al regenerar PDF:", error);
                setPdfAlert({ show: true, variant: "danger", message: "Error al regenerar el PDF" });
                setTimeout(() => setPdfAlert({ show: false, variant: "", message: "" }), 3000);
              } finally {
                setIsRegeneratingPdf(false);
              }
            }}
            disabled={isRegeneratingPdf}
            loading={isRegeneratingPdf}
          >
            {isRegeneratingPdf ? "Generando…" : "Regenerar pdf"}
          </Button>
        )}
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
