"use client";

import React from "react";
import { Minus, Plus, Save, Trash2, X } from "lucide-react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Badge,
  Alert,
  Tabs,
  Tab,
} from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { getClients, getBranches } from "@/services/coreService";
import { useAuth } from "@/context/AuthContext";
import { getBinProducts } from "@/services/inventoryService";
import { updateExit } from "@/services/orderService";
import AsyncSelect from "@/components/ui/AsyncSelect";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import VisibleSliceList from "@/components/ui/VisibleSliceList";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";
import ExitMovementsTimeline from "./ExitMovementsTimeline";


const ModalEdit = ({
  showModal,
  handleCloseModal,
  modalMode,
  selectedExit,
  setSelectedExit,
  isSaving,
  handleSaveExit,
  statusLabels,
  outTypeLabels,
  handleShowConfirmDeleteGroup,
  handleShowConfirmDeleteBin,
  handleShowQRModal,
  showQRModal,
  handleShowReverseModal,
  handleReassignExitProduct,
  handleShowReplaceBinModal,
  handleProcessAllBins,
  processingGroupId,
  initialTab = "details",
}) => {
  const isViewMode = modalMode === "view";
  const isCreateMode = modalMode === "create";
  const user = useAuth().user;
  const isClientUser = !!user?.client && !user?.is_superuser;
  const isAdmin = user?.is_superuser || user?.is_staff;

  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [binProducts, setBinProducts] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    client: null,
    status: null,
    picking_pallets: null,
    exit_date: null,
    products: {},
  });
  const [expandedBins, setExpandedBins] = useState({});
  const [expandedBatchList, setExpandedBatchList] = useState({});
  const [duplicateErrors, setDuplicateErrors] = useState({});
  const [processingBinId, setProcessingBinId] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  const productGroups = selectedExit?.exit_product_groups || [];
  const {
    visibleCount: visibleGroupsCount,
    totalCount: totalGroupsCount,
    hasMore: hasMoreGroups,
    loadMore: loadMoreGroups,
  } = useVisibleSlice(productGroups, 12, 12);


  // Actualizar la pestaña activa cuando cambie initialTab o se abra el modal
  useEffect(() => {
    if (showModal) {
      setActiveTab(initialTab);
    }
  }, [showModal, initialTab]);

  useEffect(() => {
    if (showModal) {
      if (modalMode === "view") {
        if (selectedExit) {
          // pass
        }
      } else if (modalMode === "create" || modalMode === "edit") {
        loadInitialData();
        if (isClientUser) {
          setSelectedExit((prev) => ({ ...prev, client: user.client }));
        }
      }
    } else {
      setClients([]);
      setBranches([]);
      setBinProducts([]);
      setExpandedBins({}); // Reset expanded bins state when modal closes
      setDuplicateErrors({}); // Reset duplicate errors when modal closes
      setProcessingBinId(null); // Reset processing state when modal closes
    }
    setValidationErrors({
      client: null,
      status: null,
      products: {},
    });
  }, [showModal, modalMode]);

  // Resetear processingBinId cuando selectedExit se actualice (después de procesar)
  useEffect(() => {
    if (selectedExit?.exit_product_groups) {
      setProcessingBinId(null);
    }
  }, [selectedExit]);

  // Resetear processingBinId cuando se cierra el modal QR (incluyendo cancelar)
  useEffect(() => {
    if (showQRModal === false) {
      setProcessingBinId(null);
    }
  }, [showQRModal]);

  useEffect(() => {
    if (selectedExit?.client?.id) {
      loadBranches();
      loadProducts();
    }
  }, [selectedExit?.client?.id]);

  // Efecto para inicializar bin_or_batch_list cuando se carga un exit existente
  useEffect(() => {
    if (
      selectedExit?.exit_product_groups &&
      showModal &&
      modalMode !== "create"
    ) {
      // Verificar si ya están inicializados para evitar loop
      const needsInitialization = selectedExit.exit_product_groups.some(
        (group) => !group.bin_or_batch_list
      );

      if (needsInitialization) {
        setSelectedExit((prev) => {
          if (!prev || !prev.exit_product_groups) return prev;

          return {
            ...prev,
            exit_product_groups: prev.exit_product_groups.map((group) => {
              // Si no tiene bin_or_batch_list pero sí tiene bin_or_batch, inicializar la lista
              if (!group.bin_or_batch_list && group.bin_or_batch) {
                return {
                  ...group,
                  bin_or_batch_list: group.bin_or_batch
                    .split(",")
                    .map((item) => item.trim()),
                };
              }
              // Si no tiene ninguno, inicializar con array vacío
              if (!group.bin_or_batch_list) {
                return {
                  ...group,
                  bin_or_batch_list: [""],
                };
              }
              return group;
            }),
          };
        });
      }
    }
  }, [selectedExit?.id, showModal, modalMode]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      // Si es usuario cliente, no intentes listar todos los clientes (evita 403)
      if (isClientUser) {
        setClients([user.client]);
      } else {
        const clientsData = await getClients();
        setClients(clientsData.results || []);
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadBranches = async () => {
    if (selectedExit?.client?.id) {
      setIsLoadingData(true);
      try {
        // Para usuario cliente, si el backend restringe, manejar vacío con gracia
        const branchesData = await getBranches(selectedExit.client.id);
        setBranches(branchesData.results || []);
      } catch (error) {
        console.error("Error al cargar sucursales:", error);
        setBranches([]);
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setBranches([]);
    }
  };

  const loadProducts = async () => {
    if (selectedExit?.client?.id) {
      setIsLoadingData(true);
      try {
        const filters = {
          client: selectedExit.client.id,
          status: "almacenado",
        };

        // Si se está editando una salida existente, excluirla del cálculo de reservas
        if (selectedExit?.id && modalMode === "edit") {
          filters.exclude_exit_id = selectedExit.id;
        }

        const binProductsData = await getBinProducts(filters);
        setBinProducts(binProductsData || []);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setBinProducts([]);
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setBinProducts([]);
    }
  };

  const handleAddProductGroup = () => {
    setSelectedExit((prev) => ({
      ...prev,
      exit_product_groups: [
        ...(prev.exit_product_groups || []),
        {
          product: null,
          product_name: "",
          product_uom: "",
          bin_or_batch: "",
          bin_or_batch_list: [""], // Nueva propiedad para manejar múltiples bins/lotes
          quantity: 0,
          // No incluir exit_products para nuevos productos
        },
      ],
    }));
  };

  const handleRemoveProductGroup = (index) => {
    setSelectedExit((prev) => {
      if (!prev.exit_product_groups || prev.exit_product_groups.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        exit_product_groups: prev.exit_product_groups.filter(
          (_, i) => i !== index
        ),
      };
    });
  };

  const handleProductGroupChange = (index, field, value) => {
    setSelectedExit((prev) => ({
      ...prev,
      exit_product_groups: prev.exit_product_groups.map((group, i) => {
        if (i === index) {
          return { ...group, [field]: value };
        }
        return group;
      }),
    }));
  };

  // Función para agregar un nuevo input de bin/lote
  const handleAddBinInput = (groupIndex) => {
    setSelectedExit((prev) => ({
      ...prev,
      exit_product_groups: prev.exit_product_groups.map((group, i) => {
        if (i === groupIndex) {
          return {
            ...group,
            bin_or_batch_list: [...(group.bin_or_batch_list || [""]), ""],
          };
        }
        return group;
      }),
    }));
  };

  // Función para remover un input de bin/lote
  const handleRemoveBinInput = (groupIndex, binIndex) => {
    // Limpiar errores duplicados para este grupo
    setDuplicateErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`${groupIndex}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });

    setSelectedExit((prev) => ({
      ...prev,
      exit_product_groups: prev.exit_product_groups.map((group, i) => {
        if (i === groupIndex) {
          const newList = group.bin_or_batch_list.filter(
            (_, idx) => idx !== binIndex
          );
          // Asegurar que siempre hay al menos un input
          const finalList = newList.length === 0 ? [""] : newList;
          return {
            ...group,
            bin_or_batch_list: finalList,
            bin_or_batch: finalList
              .filter((item) => item.trim() !== "")
              .join(","),
          };
        }
        return group;
      }),
    }));
  };

  // Función para actualizar un input específico de bin/lote
  const handleBinInputChange = (groupIndex, binIndex, value) => {
    // Limpiar el valor: remover espacios extra y caracteres problemáticos para CSV
    const cleanValue = value.replace(/,/g, "").trim();
    const errorKey = `${groupIndex}-${binIndex}`;

    // Limpiar error previo
    setDuplicateErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });

    setSelectedExit((prev) => ({
      ...prev,
      exit_product_groups: prev.exit_product_groups.map((group, i) => {
        if (i === groupIndex) {
          const newList = group.bin_or_batch_list.map((item, idx) =>
            idx === binIndex ? cleanValue : item
          );

          // Verificar duplicados (solo si el valor no está vacío)
          if (cleanValue !== "") {
            const duplicateIndex = newList.findIndex(
              (item, idx) =>
                idx !== binIndex &&
                item.trim() !== "" &&
                item.trim().toLowerCase() === cleanValue.toLowerCase()
            );

            // Si hay duplicado, mostrar error y no actualizar el valor
            if (duplicateIndex !== -1) {
              setDuplicateErrors((prev) => ({
                ...prev,
                [errorKey]: `El lote/bin "${cleanValue}" ya está en uso`,
              }));
              return group; // Mantener el grupo sin cambios
            }
          }

          // Filtrar valores vacíos y crear string separado por comas
          const finalString = newList
            .filter((item) => item.trim() !== "")
            .join(",");

          return {
            ...group,
            bin_or_batch_list: newList,
            bin_or_batch: finalString,
          };
        }
        return group;
      }),
    }));
  };

  const handleChange = (field, value) => {
    setSelectedExit((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleBinDropdown = (groupId) => {
    setExpandedBins((prev) => {
      // Si ya está abierto, lo cerramos
      if (prev[groupId]) {
        return {
          ...prev,
          [groupId]: false,
        };
      }
      // Si está cerrado, cerramos todos los demás y abrimos este
      else {
        // Cerrar todos y abrir solo el actual
        const newState = {};
        newState[groupId] = true;
        return newState;
      }
    });
  };

  const handleSaveClick = async () => {
    // Limpiar errores previos
    setValidationErrors({
      client: null,
      status: null,
      exit_date: null,
      products: {},
    });

    const errors = {
      client: null,
      status: null,
      exit_date: null,
      products: {},
    };

    let hasErrors = false;

    if (!selectedExit.client) {
      errors.client = "El cliente es obligatorio";
      hasErrors = true;
    }

    if (!selectedExit.exit_date) {
      errors.exit_date = "La fecha de salida es obligatoria";
      hasErrors = true;
    }

    // Los pallets de picking ya no son obligatorios

    if (
      selectedExit.exit_product_groups &&
      selectedExit.exit_product_groups.length > 0
    ) {
      selectedExit.exit_product_groups.forEach((group, index) => {
        const productErrors = {};

        if (!group.product) {
          productErrors.product = "El producto es obligatorio";
          hasErrors = true;
        }

        if (!group.id && (!group.quantity || group.quantity <= 0)) {
          productErrors.quantity = "La cantidad debe ser mayor a 0";
          hasErrors = true;
        }

        if (
          !group.id &&
          group.product &&
          group.quantity > 0 &&
          binProducts.length > 0
        ) {
          const selectedProduct = binProducts.find(
            (p) => p.product_id === group.product
          );
          if (selectedProduct && group.quantity > selectedProduct.quantity) {
            productErrors.quantity = `La cantidad no puede ser mayor a ${selectedProduct.quantity}`;
            hasErrors = true;
          }
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
      const exitDataToSave = {
        ...selectedExit,
        exit_product_groups: selectedExit.exit_product_groups.map((group) => {
          if (group.id) {
            return {
              id: group.id,
              product: group.product,
              product_name: group.product_name,
              product_uom: group.product_uom,
              bin_or_batch: group.bin_or_batch,
            };
          } else {
            return group;
          }
        }),
      };

      // Si está cambiando el estado a "completada", verificar directamente con el backend
      if (selectedExit.status === "completada" && selectedExit.id) {
        try {
          await updateExit(selectedExit.id, {
            status: "completada",
            client_id: selectedExit.client.id,
          });
          // Si no hay error, continuar con el flujo normal
          handleSaveExit(exitDataToSave);
        } catch (error) {
          console.error("Error al cambiar estado a completada:", error);

          // Capturar mensaje específico del backend para el estado
          let errorMessage = "Error al completar la orden";

          if (error.response?.data?.status) {
            errorMessage = error.response.data.status;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.message) {
            errorMessage = error.message;
          }

          // Mostrar el error en el campo de estado
          setValidationErrors((prev) => ({
            ...prev,
            status: errorMessage,
          }));
          return; // No continuar con el flujo normal si hay error
        }
      } else {
        // Flujo normal para otros cambios
        handleSaveExit(exitDataToSave);
      }
    }
  };

  const loadClientOptions = async (inputValue) => {
    try {
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

  const loadBranchOptions = async (inputValue) => {
    if (!selectedExit.client) return [];

    try {
      const response = await getBranches(selectedExit.client.id, inputValue);
      return response.results.map((branch) => ({
        value: branch.id,
        label: branch.name,
        ...branch,
      }));
    } catch (error) {
      console.error("Error al buscar sucursales:", error);
      return [];
    }
  };

  const loadProductOptions = async (inputValue, currentIndex) => {
    try {
      const filters = {
        client: selectedExit.client.id,
        status: "almacenado",
      };

      // Si se está editando una salida existente, excluirla del cálculo de reservas
      if (selectedExit?.id && modalMode === "edit") {
        filters.exclude_exit_id = selectedExit.id;
      }

      const response = await getBinProducts(filters, inputValue);

      const selectedProductIds = selectedExit.exit_product_groups
        .filter((_, idx) => idx !== currentIndex)
        .map((g) => g.product)
        .filter((id) => id !== undefined && id !== null);

      return response
        .filter((product) => !selectedProductIds.includes(product.product_id))
        .map((product) => ({
          value: product.product_id,
          label: product.name,
          ...product,
        }));
    } catch (error) {
      console.error("Error al buscar productos:", error);
      return [];
    }
  };

  const getDefaultProductOptions = (currentIndex) => {
    const selectedProductIds = selectedExit.exit_product_groups
      .filter((_, idx) => idx !== currentIndex)
      .map((g) => g.product)
      .filter((id) => id !== undefined && id !== null);

    return binProducts
      .filter((product) => !selectedProductIds.includes(product.product_id))
      .map((product) => ({
        value: product.product_id,
        label: product.name,
        client_sku: product.client_sku || "",
        ...product,
      }));
  };

  const getStatusBadgeClass = (status) => {
    if (status == "Almacenado") {
      return "bg-success-transparent text-success";
    } else if (status == "En despacho") {
      return "bg-primary-transparent text-primary";
    } else if (status == "Despachado") {
      return "bg-secondary-transparent text-secondary";
    }
    return "bg-warning-transparent text-warning";
  };

  // Función para manejar el procesamiento de bin con loading
  const handleProcessBin = (bin, groupId) => {
    if (processingBinId !== null) return; // Prevenir clics múltiples

    setProcessingBinId(bin.id);

    // Usar setTimeout para asegurar que el estado se actualice antes de abrir el modal
    setTimeout(() => {
      handleShowQRModal(bin, groupId);
    }, 0);
  };

  const modalTitle = isViewMode
    ? "Ver orden de salida"
    : selectedExit?.id
      ? "Modificar orden de salida"
      : "Nueva orden de salida";

  return (
    <Modal show={showModal} onHide={handleCloseModal} size="full">
      <style type="text/css">
        {`
          .bin-card {
            border-radius: 8px;
            border-left: 4px solid var(--bs-primary);
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
            background-color: #ffffff;
            flex: 1 1 calc(50% - 6px);
            min-width: 320px;
            max-width: 400px;
            display: flex;
            flex-direction: column;
          }
          .bin-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-1px);
          }
          .bin-card .alert {
            margin: 0;
            font-size: 0.85rem;
          }
          .bin-card > div {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .bin-card h5 {
            color: #212529;
            font-size: 1rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
          }
          .bin-card .badge {
            font-size: 0.65rem;
            padding: 0.35em 0.7em;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
          }
          .bin-card .badge i {
            font-size: 0.85rem;
            line-height: 1;
          }
          .bin-card .text-muted {
            font-size: 0.875rem;
            color: #6c757d;
            line-height: 1.5;
          }
          .bins-expanded-container {
            width: 100%;
            background-color: #f8f9fa;
          }
          .bins-container {
            max-height: 500px;
            overflow-y: auto;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
            padding: 0;
            width: 100%;
          }
          .bins-container > .alert {
            flex: 1 1 100%;
            width: 100%;
            margin-bottom: 8px;
          }
          .product-row {
          }
          .bins-dropdown-button {
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .bins-dropdown-button:hover {
            background-color: rgba(var(--bs-primary-rgb), 0.1);
          }
          
          /* Nuevos estilos para alineación vertical */
          .table td {
            vertical-align: top;
            padding-top: 12px;
          }
          
          /* Para que los controles se vean consistentes */
          .form-control, .form-select, .react-select__control {
            min-height: 38px;
            width: 100% !important;
          }
          
          /* Para asegurar que todos los contenedores tengan alineación superior */
          .table td > div, .table td > span {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
          }
          
          /* Específico para la columna de acciones */
          .table td:last-child {
            vertical-align: middle;
          }
          
          /* Asegurar que los selectores ocupen el ancho completo */
          .react-select__control {
            width: 100% !important;
          }
          
          /* Estilos para el contenedor de bins */
          .bins-expanded-container {
            width: 100%;
            background-color: #f8f9fa;
          }
          .bins-container {
            max-height: 500px;
            overflow-y: auto;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
            padding: 0;
            width: 100% !important;
          }
          .bins-container > .alert {
            flex: 1 1 100%;
            width: 100%;
            margin-bottom: 8px;
          }
          
          /* Asegurar que cada AsyncSelect ocupe el ancho completo */
          .table td .css-b62m3t-container {
            width: 100%;
          }
          
          /* Media queries para responsive */
          @media (max-width: 576px) {
            .table td {
              padding-top: 8px;
              padding-bottom: 8px;
            }
            .bins-expanded-container {
              padding: 8px !important;
            }
            .bins-container {
              max-height: 300px;
              gap: 8px;
            }
            .bin-card {
              flex: 1 1 100%;
              min-width: 100%;
            }
            .form-control, .form-select {
              font-size: 14px;
            }
            /* Estilos para múltiples inputs de bins/lotes en móvil */
            .bin-input-container {
              gap: 8px !important;
            }
            .bin-input-container .btn-icon {
              min-width: 32px;
              height: 32px;
            }
          }
          
          @media (min-width: 577px) and (max-width: 992px) {
            .bin-card {
              flex: 1 1 100%;
              min-width: 100%;
            }
          }
          
          /* Estilos para contenedor de múltiples bins/lotes */
          .bin-input-container {
            display: flex;
            flex-direction: column;
          }
          
          .bin-input-row {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
          }

          .bin-input-row:not(:last-child) {
            margin-bottom: 8px;
          }
          
          .bin-input-row .form-control {
            flex: 1;
          }
          
          .bin-input-buttons {
            display: flex;
            gap: 4px;
            flex-shrink: 0;
          }
          
          .bin-result-preview {
            font-size: 12px;
            color: #6c757d;
            background-color: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
          }
        `}
      </style>

      <Modal.Header closeButton>
        <div>
          <Modal.Title>{modalTitle}</Modal.Title>
          {selectedExit?.code ? (
            <Modal.Subtitle>
              Código:{" "}
              <span className="font-medium text-[var(--foreground)]">{selectedExit.code}</span>
              {selectedExit?.status ? (
                <Badge bg="primary" className="ms-2 align-middle">
                  {statusLabels[selectedExit.status] || selectedExit.status}
                </Badge>
              ) : null}
            </Modal.Subtitle>
          ) : (
            <Modal.Subtitle>Complete los datos para registrar una nueva salida.</Modal.Subtitle>
          )}
        </div>
      </Modal.Header>
      <Modal.Body>
        {selectedExit && (
          <>
            {/* Tabs solo en modo view */}
            {isViewMode && selectedExit.id && (
              <Tabs
                activeKey={activeTab}
                onSelect={setActiveTab}
                id="exit-tabs"
                className="mb-3"
              >
                <Tab eventKey="details" title="Detalles">
                  <div className="mt-3">
                    {/* El contenido del Form está abajo */}
                  </div>
                </Tab>
                <Tab eventKey="movements" title="Historial de Movimientos">
                  <div className="mt-3">
                    <ExitMovementsTimeline exitId={selectedExit.id} />
                  </div>
                </Tab>
              </Tabs>
            )}

            {/* Form - se muestra siempre que no estemos en la pestaña de movimientos */}
            {(!isViewMode || !selectedExit.id || activeTab === "details") && (
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
                          selectedExit.client
                            ? {
                                value: selectedExit.client.id,
                                label: selectedExit.client.name,
                                ...selectedExit.client,
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

                          handleChange("branch", null);
                          setBinProducts([]);

                          setSelectedExit((prev) => ({
                            ...prev,
                            exit_product_groups: [
                              {
                                product: null,
                                product_name: "",
                                product_uom: "",
                                bin_or_batch: "",
                                bin_or_batch_list: [""],
                                quantity: 0,
                                // No incluir exit_products para nuevos productos
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
                          inputValue
                            ? "No hay resultados"
                            : "Escriba para buscar"
                        }
                      />
                      {validationErrors.client && (
                        <Form.Text className="text-danger">
                          {validationErrors.client}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-0">
                    <Form.Group controlId="branch-select" className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">Sucursal</Form.Label>
                      <AsyncSelect
                        inputId="branch-select"
                        name="branch"
                        value={
                          selectedExit.branch
                            ? {
                                value: selectedExit.branch.id,
                                label: selectedExit.branch.name,
                                ...selectedExit.branch,
                              }
                            : null
                        }
                        loadOptions={loadBranchOptions}
                        defaultOptions={branches.map((branch) => ({
                          value: branch.id,
                          label: branch.name,
                          ...branch,
                        }))}
                        isDisabled={isViewMode || !selectedExit.client}
                        isLoading={isLoadingData}
                        onChange={(selected) => {
                          handleChange(
                            "branch",
                            selected
                              ? {
                                  id: selected.value,
                                  name: selected.label,
                                }
                              : null
                          );
                        }}
                        placeholder={
                          !selectedExit.client
                            ? "Seleccione un cliente primero"
                            : isLoadingData
                            ? "Cargando sucursales..."
                            : "Seleccione una sucursal"
                        }
                        isClearable
                        noOptionsMessage={({ inputValue }) =>
                          !selectedExit.client
                            ? "Seleccione un cliente primero"
                            : inputValue
                            ? "No hay resultados"
                            : "Escriba para buscar"
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-0">
                    <Form.Group controlId="status-select" className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">Estado</Form.Label>
                      <Form.Select
                        name="status"
                        value={selectedExit.status || ""}
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
                          const isCurrentStatus =
                            selectedExit?.status === value;
                          const isDisabledOption =
                            !isViewMode &&
                            !isSelectableStatus &&
                            !isCurrentStatus;
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
                        <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          Solo se puede cambiar manualmente a{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">Pendiente</span> y{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">Cancelada</span>. Los
                          otros estados se actualizan automáticamente por el sistema.
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-0">
                    <Form.Group controlId="out_type-select" className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">Tipo de salida</Form.Label>
                      <Form.Select
                        name="out_type"
                        value={selectedExit.out_type || ""}
                        disabled={isViewMode}
                        onChange={(e) => {
                          handleChange("out_type", e.target.value);
                          setValidationErrors((prev) => ({
                            ...prev,
                            out_type: null,
                          }));
                        }}
                        isInvalid={!!validationErrors.out_type}
                      >
                        <option value="">Seleccione un tipo de salida</option>
                        {Object.entries(outTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Form.Select>
                      {validationErrors.out_type && (
                        <Form.Text className="text-danger">
                          {validationErrors.out_type}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-0">
                    <Form.Group controlId="exit_date-input" className="mb-0">
                      <Form.Label className="!text-xs !font-medium !text-slate-600">
                        Fecha de salida <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        name="exit_date"
                        value={selectedExit.exit_date || ""}
                        disabled={isViewMode}
                        onChange={(e) => {
                          handleChange("exit_date", e.target.value);
                          setValidationErrors((prev) => ({
                            ...prev,
                            exit_date: null,
                          }));
                        }}
                        isInvalid={!!validationErrors.exit_date}
                        required
                      >
                        <option value="">Seleccione fecha de salida</option>
                        {(() => {
                          // Generar opciones de fecha para los próximos 14 días
                          const options = [];
                          const today = new Date();
                          for (let i = 0; i < 14; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() + i);
                            const dateValue = date.toISOString().split("T")[0]; // YYYY-MM-DD
                            const dayName = date.toLocaleDateString("es-PA", {
                              weekday: "long",
                            });
                            const dayNum = date.getDate();
                            const monthName = date.toLocaleDateString("es-PA", {
                              month: "long",
                            });
                            const capitalizedDay =
                              dayName.charAt(0).toUpperCase() +
                              dayName.slice(1);
                            const label =
                              i === 0
                                ? `Hoy - ${capitalizedDay}, ${dayNum} de ${monthName}`
                                : i === 1
                                ? `Mañana - ${capitalizedDay}, ${dayNum} de ${monthName}`
                                : `${capitalizedDay}, ${dayNum} de ${monthName}`;
                            options.push(
                              <option key={dateValue} value={dateValue}>
                                {label}
                              </option>
                            );
                          }
                          return options;
                        })()}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.exit_date}
                      </Form.Control.Feedback>
                      {selectedExit.exit_date && (
                        <Form.Text className="text-muted">
                          {(() => {
                            const [year, month, day] = selectedExit.exit_date
                              .split("-")
                              .map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString("es-PA", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            });
                          })()}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  {/* picking_pallets — fila 3 col 2 cuando aplica */}
                  {selectedExit.exit_product_groups?.some((group) =>
                    group.exit_products?.some((ep) => ep.is_picking)
                  ) && (
                    <Col md={6} className="mb-0">
                      <Form.Group controlId="picking_pallets-input" className="mb-0">
                        <Form.Label className="!text-xs !font-medium !text-slate-600">
                          Pallets picking
                        </Form.Label>
                        <Form.Control
                          name="picking_pallets"
                          type="number"
                          min="0"
                          value={
                            selectedExit.picking_pallets ??
                            selectedExit.exit_detail?.picking_pallets ??
                            0
                          }
                          disabled={isViewMode}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue =
                              value === "" ? 0 : parseInt(value, 10);
                            handleChange(
                              "picking_pallets",
                              isNaN(numValue) ? 0 : numValue
                            );
                            if (validationErrors.picking_pallets) {
                              setValidationErrors((prev) => ({
                                ...prev,
                                picking_pallets: null,
                              }));
                            }
                          }}
                          isInvalid={!!validationErrors.picking_pallets}
                        />
                        {validationErrors.picking_pallets ? (
                          <Form.Text className="text-danger">
                            <i className="ri-alert-line me-1"></i>
                            {validationErrors.picking_pallets}
                          </Form.Text>
                        ) : (
                          <Form.Text className="text-muted">
                            Opcional. Se sumará al total de pallets/bins en el
                            PDF si se especifica.
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  )}
                </Row>
                </Modal.Section>

                <Modal.Section title="Productos de la orden" className="!p-3.5">
                  {validationErrors.products?.general && (
                    <p className="mb-2 text-xs text-red-600">{validationErrors.products.general}</p>
                  )}

                  <div
                    className="table-responsive mt-3"
                    style={{ maxWidth: "100%", overflowX: "auto" }}
                  >
                    <table className="w-full min-w-[720px] border-collapse text-sm [&_tbody_td]:align-top [&_tbody_td]:px-2 [&_tbody_td]:py-2.5">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] text-left">
                          <th className="px-2 py-2 text-xs font-medium text-slate-500" style={{ width: "30%" }}>
                            Producto {!isViewMode && <span className="text-red-500">*</span>}
                          </th>
                          <th className="px-2 py-2 text-xs font-medium text-slate-500" style={{ width: "20%" }}>
                            Lotes/bins
                          </th>
                          <th className="px-2 py-2 text-xs font-medium text-slate-500" style={{ width: "15%" }}>
                            Cantidad {!isViewMode && <span className="text-red-500">*</span>}
                          </th>
                          <th className="px-2 py-2 text-xs font-medium text-slate-500" style={{ width: "35%" }}>
                            Bins asignados
                          </th>
                          {(isCreateMode ||
                            (!isViewMode &&
                              !isClientUser &&
                              ["pendiente", "en_progreso"].includes(
                                selectedExit?.status
                              ))) && (
                            <th className="px-2 py-2 text-xs font-medium text-slate-500" style={{ minWidth: "72px" }}>
                              Eliminar
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {productGroups
                          .slice(0, visibleGroupsCount)
                          .map((group, index) => (
                              <React.Fragment key={group.id ?? index}>
                                <tr className="product-row">

                                  <td>
                                    <Form.Group
                                      controlId={`product-${index}`}
                                      className="mb-0 w-full"
                                    >
                                      <AsyncSelect
                                        inputId={`product-${index}`}
                                        name={`product-${index}`}
                                        size="sm"
                                        value={
                                          group.product
                                            ? {
                                                value: group.product,
                                                label: group.product_name,
                                                name: group.product_name,
                                                client_sku:
                                                  group.product_sku || "",
                                              }
                                            : null
                                        }
                                        loadOptions={(inputValue) =>
                                          loadProductOptions(inputValue, index)
                                        }
                                        defaultOptions={getDefaultProductOptions(
                                          index
                                        )}
                                        isDisabled={
                                          isViewMode ||
                                          !selectedExit.client ||
                                          group.id
                                        }
                                        isLoading={isLoadingData}
                                        isOptionDisabled={(option) =>
                                          option.is_fully_reserved
                                        }
                                        onChange={(selected) => {
                                          handleProductGroupChange(
                                            index,
                                            "product",
                                            selected ? selected.value : null
                                          );
                                          handleProductGroupChange(
                                            index,
                                            "product_name",
                                            selected
                                              ? selected.name || selected.label
                                              : ""
                                          );
                                          handleProductGroupChange(
                                            index,
                                            "product_sku",
                                            selected
                                              ? selected.client_sku || ""
                                              : ""
                                          );
                                          handleProductGroupChange(
                                            index,
                                            "product_uom",
                                            selected
                                              ? selected.uom || "Unidades"
                                              : ""
                                          );
                                          setValidationErrors((prev) => {
                                            const newProductErrors = {
                                              ...prev.products,
                                            };
                                            if (newProductErrors[index]) {
                                              delete newProductErrors[index]
                                                .product;
                                              if (
                                                Object.keys(
                                                  newProductErrors[index]
                                                ).length === 0
                                              ) {
                                                delete newProductErrors[index];
                                              }
                                            }
                                            return {
                                              ...prev,
                                              products: newProductErrors,
                                            };
                                          });
                                        }}
                                        placeholder={
                                          !selectedExit.client
                                            ? "Seleccione un cliente primero"
                                            : isLoadingData
                                            ? "Cargando productos..."
                                            : "Seleccione un producto"
                                        }
                                        isClearable={!isViewMode}
                                        noOptionsMessage={({ inputValue }) =>
                                          !selectedExit.client
                                            ? "Seleccione un cliente primero"
                                            : inputValue
                                            ? "No hay resultados o productos disponibles"
                                            : "Escriba para buscar"
                                        }
                                        formatOptionLabel={(
                                          option,
                                          { context }
                                        ) => (
                                          <div>
                                            <div
                                              style={{
                                                fontWeight:
                                                  context === "value"
                                                    ? "normal"
                                                    : "bold",
                                                fontSize: "0.75rem",
                                                wordBreak: "break-word",
                                                whiteSpace: "normal",
                                              }}
                                            >
                                              {option.name || option.label}
                                              {option.client_sku && (
                                                <span
                                                  style={{
                                                    fontWeight: "normal",
                                                    color: "#6c757d",
                                                  }}
                                                >
                                                  {" "}
                                                  - SKU: {option.client_sku}
                                                </span>
                                              )}
                                            </div>
                                            {context === "menu" && (
                                              <>
                                                <div
                                                  style={{
                                                    fontSize: "0.875rem",
                                                    color: "#6c757d",
                                                  }}
                                                >
                                                  {option.quantity} {option.uom}
                                                </div>
                                                {option.is_fully_reserved && (
                                                  <div
                                                    style={{
                                                      fontSize: "0.8rem",
                                                      color: "#fd7e14",
                                                      marginTop: "4px",
                                                      fontWeight: "500",
                                                    }}
                                                  >
                                                    ⚠️ RESERVADO -{" "}
                                                    {option.total_inventory}{" "}
                                                    unidades en salidas
                                                    pendientes
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )}
                                        menuPortalTarget={document.body}
                                        styles={{
                                          menuPortal: (base) => ({
                                            ...base,
                                            zIndex: 9999,
                                          }),
                                          control: (base) => ({
                                            ...base,
                                            width: "100%",
                                          }),
                                          container: (base) => ({
                                            ...base,
                                            width: "100%",
                                          }),
                                        }}
                                      />
                                      {validationErrors.products[index]
                                        ?.product && (
                                        <Form.Text className="text-danger mt-1">
                                          {
                                            validationErrors.products[index]
                                              .product
                                          }
                                        </Form.Text>
                                      )}
                                    </Form.Group>
                                  </td>
                                  <td>
                                    <Form.Group
                                      controlId={`bin_or_batch-${index}`}
                                      className="mb-0 w-full"
                                    >
                                      <div className="bin-input-container flex flex-col gap-2">
                                        {/* Para productos existentes con múltiples lotes/bins, mostrar colapsado */}
                                        {group.id &&
                                        (group.bin_or_batch_list || []).length >
                                          1 ? (
                                          <>
                                            {/* Mostrar el primero siempre */}
                                            <div className="bin-input-row">
                                              <Form.Control
                                                type="text"
                                                value={
                                                  (group.bin_or_batch_list || [
                                                    "",
                                                  ])[0]
                                                }
                                                disabled={true}
                                                size="sm"
                                              />
                                            </div>
                                            {/* Mostrar los demás si está expandido */}
                                            {expandedBatchList[index] &&
                                              (group.bin_or_batch_list || [])
                                                .slice(1)
                                                .map((binValue, binIndex) => (
                                                  <div
                                                    key={binIndex + 1}
                                                    className="bin-input-row"
                                                  >
                                                    <Form.Control
                                                      type="text"
                                                      value={binValue}
                                                      disabled={true}
                                                      size="sm"
                                                    />
                                                  </div>
                                                ))}
                                            {/* Botón Ver más / Ver menos */}
                                            <Button
                                              variant="link"
                                              size="sm"
                                              className="p-0 mt-1 align-self-start"
                                              onClick={() =>
                                                setExpandedBatchList(
                                                  (prev) => ({
                                                    ...prev,
                                                    [index]: !prev[index],
                                                  })
                                                )
                                              }
                                            >
                                              {expandedBatchList[index] ? (
                                                <>
                                                  <i className="ri-arrow-up-s-line me-1"></i>
                                                  Ver menos
                                                </>
                                              ) : (
                                                <>
                                                  <i className="ri-arrow-down-s-line me-1"></i>
                                                  Ver{" "}
                                                  {(
                                                    group.bin_or_batch_list ||
                                                    []
                                                  ).length - 1}{" "}
                                                  más
                                                </>
                                              )}
                                            </Button>
                                          </>
                                        ) : (
                                          /* Productos nuevos o con un solo lote/bin */
                                          (group.bin_or_batch_list || [""]).map(
                                            (binValue, binIndex) => (
                                              <div
                                                key={binIndex}
                                                className="bin-input-row"
                                              >
                                                <div className="d-flex flex-column w-100">
                                                  <div className="flex items-center gap-1.5">
                                                    <Form.Control
                                                      type="text"
                                                      value={binValue}
                                                      disabled={
                                                        isViewMode ||
                                                        (modalMode === "edit" &&
                                                          group.id)
                                                      }
                                                      onChange={(e) => {
                                                        handleBinInputChange(
                                                          index,
                                                          binIndex,
                                                          e.target.value
                                                        );
                                                      }}
                                                      placeholder={
                                                        binIndex === 0
                                                          ? "Lote o id de bin"
                                                          : "Lote/bin adicional"
                                                      }
                                                      size="sm"
                                                      className="min-w-0 flex-1"
                                                      isInvalid={
                                                        !!duplicateErrors[
                                                          `${index}-${binIndex}`
                                                        ]
                                                      }
                                                    />
                                                    {!isViewMode &&
                                                      !(
                                                        modalMode === "edit" &&
                                                        group.id
                                                      ) && (
                                                        <div className="flex shrink-0 items-center gap-1">
                                                          {binIndex ===
                                                            (
                                                              group.bin_or_batch_list || [
                                                                "",
                                                              ]
                                                            ).length -
                                                              1 && (
                                                            <IconButton
                                                              variant="ghost"
                                                              size="sm"
                                                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                                              onClick={() =>
                                                                handleAddBinInput(
                                                                  index
                                                                )
                                                              }
                                                              title="Agregar otro lote/bin"
                                                              aria-label="Agregar otro lote/bin"
                                                            >
                                                              <Plus className="h-4 w-4" />
                                                            </IconButton>
                                                          )}
                                                          {(
                                                            group.bin_or_batch_list || [
                                                              "",
                                                            ]
                                                          ).length > 1 && (
                                                            <IconButton
                                                              variant="ghost"
                                                              size="sm"
                                                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                              onClick={() =>
                                                                handleRemoveBinInput(
                                                                  index,
                                                                  binIndex
                                                                )
                                                              }
                                                              title="Remover este lote/bin"
                                                              aria-label="Remover este lote/bin"
                                                            >
                                                              <Minus className="h-4 w-4" />
                                                            </IconButton>
                                                          )}
                                                        </div>
                                                      )}
                                                  </div>
                                                  {duplicateErrors[
                                                    `${index}-${binIndex}`
                                                  ] && (
                                                    <Form.Text className="text-danger">
                                                      {
                                                        duplicateErrors[
                                                          `${index}-${binIndex}`
                                                        ]
                                                      }
                                                    </Form.Text>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          )
                                        )}
                                        {/* Resultado solo para productos nuevos con múltiples valores */}
                                        {!group.id &&
                                          (
                                            group.bin_or_batch_list || [""]
                                          ).filter((item) => item.trim() !== "")
                                            .length > 1 && (
                                            <div className="bin-result-preview">
                                              <strong>Resultado:</strong>{" "}
                                              {group.bin_or_batch || "Vacío"}
                                            </div>
                                          )}
                                        {modalMode === "edit" && group.id && (
                                          <Form.Text className="text-muted mt-1">
                                            Los lotes/bins no se pueden
                                            modificar en productos existentes
                                          </Form.Text>
                                        )}
                                      </div>
                                    </Form.Group>
                                  </td>
                                  <td>
                                    <Form.Group
                                      controlId={`quantity-${index}`}
                                      className="mb-0 w-full"
                                    >
                                      <Form.Control
                                        name={`quantity-${index}`}
                                        type="number"
                                        size="sm"
                                        placeholder="0"
                                        value={
                                          group.quantity === 0 ||
                                          group.quantity === null ||
                                          group.quantity === undefined
                                            ? ""
                                            : group.quantity
                                        }
                                        disabled={
                                          isViewMode ||
                                          (modalMode === "edit" && group.id)
                                        }
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          const numValue =
                                            value === ""
                                              ? 0
                                              : parseInt(value, 10);
                                          handleProductGroupChange(
                                            index,
                                            "quantity",
                                            isNaN(numValue) ? 0 : numValue
                                          );
                                          setValidationErrors((prev) => {
                                            const newProductErrors = {
                                              ...prev.products,
                                            };
                                            if (newProductErrors[index]) {
                                              delete newProductErrors[index]
                                                .quantity;
                                              if (
                                                Object.keys(
                                                  newProductErrors[index]
                                                ).length === 0
                                              ) {
                                                delete newProductErrors[index];
                                              }
                                            }
                                            return {
                                              ...prev,
                                              products: newProductErrors,
                                            };
                                          });
                                        }}
                                        isInvalid={
                                          !!validationErrors.products[index]
                                            ?.quantity
                                        }
                                      />
                                      {validationErrors.products[index]
                                        ?.quantity && (
                                        <Form.Text className="text-danger mt-1">
                                          {
                                            validationErrors.products[index]
                                              .quantity
                                          }
                                        </Form.Text>
                                      )}
                                      {modalMode === "edit" && group.id && (
                                        <Form.Text className="text-muted mt-1">
                                          La cantidad no se puede modificar en
                                          productos existentes
                                        </Form.Text>
                                      )}
                                    </Form.Group>
                                  </td>
                                  <td>
                                    {isCreateMode ? (
                                      <p className="pt-1 text-xs leading-relaxed text-slate-500">
                                        Los bins se generarán automáticamente
                                      </p>
                                    ) : group.exit_products &&
                                      group.exit_products.length > 0 ? (
                                      <div className="w-100">
                                        <div className="d-flex align-items-center mb-2 gap-2 flex-wrap">
                                          <span className="badge bg-primary p-2">
                                            {group.quantity ?? 0}{" "}
                                            {group.product_uom || ""}
                                          </span>
                                          <span className="badge bg-info p-2">
                                            {group.exit_products?.length || 0}{" "}
                                            bins
                                          </span>
                                          {/* Badge de advertencia si hay conflictos */}
                                          {group.exit_products?.some(
                                            (b) =>
                                              b.has_stock_conflict &&
                                              !b.is_processed
                                          ) && (
                                            <span className="badge bg-warning p-2">
                                              <i className="ri-alert-line me-1"></i>
                                              Conflictos
                                            </span>
                                          )}
                                          {/* Botón Procesar todos - visible cuando hay más de 10 bins no procesados (solo admin) */}
                                          {isAdmin &&
                                            handleProcessAllBins &&
                                            [
                                              "pendiente",
                                              "en_progreso",
                                            ].includes(selectedExit?.status) &&
                                            group.exit_products?.filter(
                                              (b) => !b.is_processed
                                            ).length > 1 && (
                                              <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() =>
                                                  handleProcessAllBins(group.id)
                                                }
                                                disabled={
                                                  processingGroupId !== null
                                                }
                                              >
                                                {processingGroupId ===
                                                group.id ? (
                                                  <>
                                                    <span
                                                      className="spinner-border spinner-border-sm me-1"
                                                      role="status"
                                                      aria-hidden="true"
                                                    ></span>
                                                    Procesando...
                                                  </>
                                                ) : (
                                                  <>
                                                    <i className="ri-play-circle-line me-1"></i>
                                                    Procesar todos los bins
                                                  </>
                                                )}
                                              </Button>
                                            )}
                                          <Button
                                            variant="light"
                                            size="sm"
                                            className="bins-dropdown-button"
                                            onClick={() =>
                                              toggleBinDropdown(group.id)
                                            }
                                          >
                                            <i
                                              className={`ri-${
                                                expandedBins[group.id]
                                                  ? "arrow-up"
                                                  : "arrow-down"
                                              }-s-line`}
                                            ></i>
                                            {expandedBins[group.id]
                                              ? " Ocultar"
                                              : " Ver bins"}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted">
                                        Sin bins asignados
                                      </span>
                                    )}
                                  </td>
                                  {(isCreateMode ||
                                    (!isViewMode &&
                                      !isClientUser &&
                                      ["pendiente", "en_progreso"].includes(
                                        selectedExit?.status
                                      ))) && (
                                    <td className="!align-middle text-center">
                                      {(!group.id ||
                                        !group.exit_products?.some(
                                          (p) => p.is_processed
                                        )) && (
                                        <IconButton
                                          variant="ghost"
                                          size="sm"
                                          className="mx-auto h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                                          onClick={() => {
                                            if (
                                              group.id &&
                                              handleShowConfirmDeleteGroup
                                            ) {
                                              handleShowConfirmDeleteGroup(
                                                group
                                              );
                                            } else {
                                              handleRemoveProductGroup(index);
                                            }
                                          }}
                                          disabled={
                                            selectedExit.exit_product_groups
                                              .length <= 1
                                          }
                                          title={
                                            group.id
                                              ? "Eliminar producto de la orden"
                                              : "Eliminar producto"
                                          }
                                          aria-label={
                                            group.id
                                              ? "Eliminar producto de la orden"
                                              : "Eliminar producto"
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </IconButton>
                                      )}
                                    </td>
                                  )}
                                </tr>
                                {/* Fila expandida para bins - ocupa todo el ancho */}
                                {!isCreateMode &&
                                  expandedBins[group.id] &&
                                  group.exit_products &&
                                  group.exit_products.length > 0 && (
                                    <tr>
                                      <td
                                        colSpan={
                                          isCreateMode ||
                                          (!isViewMode &&
                                            !isClientUser &&
                                            [
                                              "pendiente",
                                              "en_progreso",
                                            ].includes(selectedExit?.status))
                                            ? 5
                                            : 4
                                        }
                                        className="p-0 border-0"
                                      >
                                        <div className="bins-expanded-container p-3 bg-light-subtle">
                                          <div className="bins-container">
                                            {/* Alerta de inventario reservado - solo en órdenes no completadas y con bins no procesados */}
                                            {selectedExit?.status !==
                                              "completada" &&
                                              group.exit_products &&
                                              group.exit_products.length > 0 &&
                                              group.exit_products.some(
                                                (b) => !b.is_processed
                                              ) &&
                                              group.exit_products[0]
                                                .reserved_in_pending_orders !==
                                                undefined && (
                                                <Alert
                                                  variant="info"
                                                  className="mb-2 py-2"
                                                >
                                                  <div className="d-flex align-items-start gap-2">
                                                    <i className="ri-information-line fs-5"></i>
                                                    <div className="small">
                                                      <strong>
                                                        Estado de inventario:
                                                      </strong>
                                                      <br />
                                                      Reservado para bins no
                                                      procesados:{" "}
                                                      <strong>
                                                        {
                                                          group.exit_products[0]
                                                            .reserved_in_pending_orders
                                                        }{" "}
                                                        {
                                                          group.exit_products[0]
                                                            .product_uom
                                                        }
                                                      </strong>
                                                      <br />
                                                      Total disponible en
                                                      inventario:{" "}
                                                      <strong>
                                                        {
                                                          group.exit_products[0]
                                                            .total_inventory_available
                                                        }{" "}
                                                        {
                                                          group.exit_products[0]
                                                            .product_uom
                                                        }
                                                      </strong>
                                                    </div>
                                                  </div>
                                                </Alert>
                                              )}

                                            {/* Alerta de conflicto de stock si algún bin tiene problemas */}
                                            {group.exit_products.some(
                                              (b) =>
                                                b.has_stock_conflict &&
                                                !b.is_processed
                                            ) && (
                                              <Alert
                                                variant="warning"
                                                className="mb-2 py-2"
                                              >
                                                <div className="d-flex align-items-center gap-2">
                                                  <i className="ri-alert-line fs-5"></i>
                                                  <div className="small">
                                                    <strong>
                                                      Conflicto de stock
                                                      detectado:
                                                    </strong>{" "}
                                                    Uno o más bins no tienen
                                                    suficiente stock disponible.
                                                    Al procesar se reasignarán
                                                    automáticamente a bins con
                                                    stock disponible.
                                                  </div>
                                                </div>
                                              </Alert>
                                            )}
                                            <VisibleSliceList
                                              items={group.exit_products || []}
                                              itemLabel="bins"
                                            >
                                              {(visibleBins) =>
                                                visibleBins.map((bin, binIndex) => (
                                                <div
                                                  key={bin.id ?? binIndex}
                                                  className={`bin-card p-3 ${
                                                    bin.has_stock_conflict &&
                                                    !bin.is_processed
                                                      ? "border-warning border-2"
                                                      : ""
                                                  }`}
                                                >
                                                  {/* Alerta individual de conflicto */}
                                                  {bin.has_stock_conflict &&
                                                    !bin.is_processed && (
                                                      <div className="alert alert-warning py-2 px-2 mb-2 small">
                                                        <div className="d-flex align-items-start gap-1">
                                                          <i className="ri-alert-line fs-6 mt-1"></i>
                                                          <div>
                                                            <div className="mb-1">
                                                              <strong>
                                                                Sin stock en
                                                                este bin:
                                                              </strong>{" "}
                                                              Necesita{" "}
                                                              {bin.quantity}{" "}
                                                              pero este bin solo
                                                              tiene{" "}
                                                              {bin.available_quantity ||
                                                                0}{" "}
                                                              disponible(s)
                                                            </div>
                                                            {bin.alternative_bin && (
                                                              <div className="mt-2 pt-2 border-top border-warning">
                                                                <i className="ri-arrow-right-line me-1"></i>
                                                                <strong>
                                                                  Se reasignará
                                                                  a:
                                                                </strong>{" "}
                                                                {
                                                                  bin
                                                                    .alternative_bin
                                                                    .bin_code
                                                                }
                                                                {bin
                                                                  .alternative_bin
                                                                  .position && (
                                                                  <span>
                                                                    {" "}
                                                                    (Pos:{" "}
                                                                    {
                                                                      bin
                                                                        .alternative_bin
                                                                        .position
                                                                    }
                                                                    )
                                                                  </span>
                                                                )}
                                                                <br />
                                                                <small className="text-muted">
                                                                  Disponible en
                                                                  este bin:{" "}
                                                                  {
                                                                    bin
                                                                      .alternative_bin
                                                                      .quantity
                                                                  }{" "}
                                                                  {
                                                                    bin.product_uom
                                                                  }
                                                                  {bin
                                                                    .alternative_bin
                                                                    .same_batch && (
                                                                    <span className="badge bg-success ms-1">
                                                                      Mismo lote
                                                                    </span>
                                                                  )}
                                                                </small>
                                                              </div>
                                                            )}
                                                            {/* Botón de reasignación manual - fuera de la sección alternativa */}
                                                            {bin.alternative_bin &&
                                                              handleReassignExitProduct && (
                                                                <div className="mt-2">
                                                                  <Button
                                                                    variant="warning"
                                                                    size="sm"
                                                                    className="btn-wave w-100"
                                                                    onClick={() =>
                                                                      handleReassignExitProduct(
                                                                        bin.id
                                                                      )
                                                                    }
                                                                  >
                                                                    <i className="ri-swap-line me-1"></i>
                                                                    Reasignar
                                                                    ahora
                                                                  </Button>
                                                                </div>
                                                              )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  <div className="d-flex flex-column">
                                                    {/* Código del bin */}
                                                    <h5 className="fw-bold mb-2">
                                                      {bin.bin_code}
                                                    </h5>

                                                    {/* Badges de estado */}
                                                    <div className="d-flex gap-1 flex-wrap mb-3">
                                                      <Badge
                                                        className={`text-uppercase ${getStatusBadgeClass(
                                                          bin.status
                                                        )}`}
                                                      >
                                                        <i className="ri-inbox-line me-1"></i>
                                                        {bin.status}
                                                      </Badge>
                                                      {bin.is_picking && (
                                                        <Badge className="text-uppercase bg-info-transparent text-info">
                                                          <i className="ri-cursor-line me-1"></i>
                                                          Picking
                                                        </Badge>
                                                      )}
                                                      {bin.was_qr_validated ? (
                                                        <Badge className="text-uppercase bg-success-transparent text-success">
                                                          <i className="ri-qr-code-line me-1"></i>
                                                          QR Validado
                                                        </Badge>
                                                      ) : (
                                                        <Badge className="text-uppercase bg-secondary-transparent text-secondary">
                                                          <i className="ri-qr-code-line me-1"></i>
                                                          QR No Validado
                                                        </Badge>
                                                      )}
                                                      {bin.is_processed ? (
                                                        <Badge className="text-uppercase bg-info-transparent text-info">
                                                          <i className="ri-check-double-line me-1"></i>
                                                          Procesado
                                                        </Badge>
                                                      ) : (
                                                        <Badge className="text-uppercase bg-warning-transparent text-warning">
                                                          <i className="ri-time-line me-1"></i>
                                                          No Procesado
                                                        </Badge>
                                                      )}
                                                    </div>

                                                    {/* Información del bin */}
                                                    <div className="text-muted">
                                                      {bin.is_processed ? (
                                                        <div className="mb-2">
                                                          Procesado:{" "}
                                                          {bin.quantity}{" "}
                                                          {bin.product_uom}
                                                        </div>
                                                      ) : (
                                                        <>
                                                          <div className="mb-2">
                                                            Reservado:{" "}
                                                            {bin.quantity}{" "}
                                                            {bin.product_uom}
                                                          </div>
                                                          <div className="mb-2">
                                                            Disponible en este
                                                            bin:{" "}
                                                            {bin.available_quantity ||
                                                              0}{" "}
                                                            {bin.product_uom}
                                                          </div>
                                                        </>
                                                      )}
                                                      <div className="mb-2">
                                                        Posición:{" "}
                                                        {bin.position ||
                                                          "Sin posición"}
                                                      </div>
                                                      {bin.batch && (
                                                        <div className="mb-2">
                                                          Lote: {bin.batch}
                                                        </div>
                                                      )}
                                                      {bin.expiration_date && (
                                                        <div className="mb-2">
                                                          Vence:{" "}
                                                          {new Date(
                                                            bin.expiration_date
                                                          )
                                                            .toLocaleDateString(
                                                              "es-ES",
                                                              {
                                                                day: "2-digit",
                                                                month:
                                                                  "2-digit",
                                                                year: "numeric",
                                                              }
                                                            )
                                                            .replace(
                                                              /\//g,
                                                              "/"
                                                            )}
                                                        </div>
                                                      )}
                                                    </div>
                                                    {/* Botones de acción en la parte inferior - solo para bins NO procesados */}
                                                    {!bin.is_processed &&
                                                      !isClientUser &&
                                                      [
                                                        "pendiente",
                                                        "en_progreso",
                                                      ].includes(
                                                        selectedExit?.status
                                                      ) && (
                                                        <div className="d-flex justify-content-end gap-2 flex-wrap mt-auto pt-2 border-top">
                                                          {handleShowQRModal && (
                                                            <Button
                                                              variant="primary"
                                                              size="sm"
                                                              className="btn-wave"
                                                              onClick={() =>
                                                                handleProcessBin(
                                                                  bin,
                                                                  group.id
                                                                )
                                                              }
                                                              disabled={
                                                                processingBinId !==
                                                                null
                                                              }
                                                              aria-label="Procesar bin"
                                                              title="Procesar bin"
                                                            >
                                                              {processingBinId ===
                                                              bin.id ? (
                                                                <>
                                                                  <span
                                                                    className="spinner-border spinner-border-sm me-1"
                                                                    role="status"
                                                                    aria-hidden="true"
                                                                  ></span>
                                                                  Procesando...
                                                                </>
                                                              ) : (
                                                                <>
                                                                  <i className="ri-qr-code-line me-1"></i>
                                                                  Procesar
                                                                </>
                                                              )}
                                                            </Button>
                                                          )}
                                                          {!isViewMode &&
                                                            handleShowConfirmDeleteBin && (
                                                              <Button
                                                                variant="danger"
                                                                size="sm"
                                                                icon={Trash2}
                                                                onClick={() =>
                                                                  handleShowConfirmDeleteBin(
                                                                    bin
                                                                  )
                                                                }
                                                                disabled={
                                                                  processingBinId !==
                                                                  null
                                                                }
                                                                aria-label="Eliminar bin"
                                                                title="Eliminar bin de la orden"
                                                              >
                                                                Eliminar
                                                              </Button>
                                                            )}
                                                          {handleShowReplaceBinModal && (
                                                            <Button
                                                              variant="secondary"
                                                              size="sm"
                                                              className="btn-wave"
                                                              onClick={() =>
                                                                handleShowReplaceBinModal(
                                                                  bin
                                                                )
                                                              }
                                                              disabled={
                                                                processingBinId !==
                                                                null
                                                              }
                                                              aria-label="Reemplazar bin"
                                                              title="Reemplazar bin mediante escaneo QR"
                                                            >
                                                              <i className="ri-swap-line me-1"></i>
                                                              Reemplazar
                                                            </Button>
                                                          )}
                                                        </div>
                                                      )}
                                                    {/* Botón de revertir para bins procesados - solo admin y en_progreso */}
                                                    {bin.is_processed &&
                                                      isAdmin &&
                                                      selectedExit?.status ===
                                                        "en_progreso" &&
                                                      handleShowReverseModal && (
                                                        <div className="d-flex justify-content-end gap-2 mt-auto pt-2 border-top">
                                                          <Button
                                                            variant="warning"
                                                            size="sm"
                                                            className="btn-wave"
                                                            onClick={() =>
                                                              handleShowReverseModal(
                                                                bin.id,
                                                                selectedExit?.id
                                                              )
                                                            }
                                                            aria-label="Revertir operación"
                                                            title="Revertir operación - Restaurar inventario del bin"
                                                          >
                                                            <i className="ri-arrow-go-back-line me-1"></i>
                                                            Revertir
                                                          </Button>
                                                        </div>
                                                      )}
                                                  </div>
                                                </div>
                                              ))
                                              }
                                            </VisibleSliceList>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                              </React.Fragment>
                            ))}
                      </tbody>
                    </table>
                    <LoadMoreFooter
                      hasMore={hasMoreGroups}
                      onLoadMore={loadMoreGroups}
                      loadedCount={Math.min(visibleGroupsCount, totalGroupsCount)}
                      totalCount={totalGroupsCount}
                      itemLabel="productos"
                    />
                  </div>
                    {!isViewMode &&
                      (isCreateMode ||
                        selectedExit?.status === "pendiente" ||
                        selectedExit?.status === "en_progreso") && (
                        <div className="mt-3 flex justify-end border-t border-[var(--border-subtle)] pt-3">
                          <Button
                            variant="success"
                            size="sm"
                            icon={Plus}
                            onClick={handleAddProductGroup}
                          >
                            Agregar producto
                          </Button>
                        </div>
                      )}
                </Modal.Section>
              </Form>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={handleCloseModal} disabled={isSaving}>
          Cerrar
        </Button>
        {!isViewMode && (
          <Button
            variant="primary"
            icon={Save}
            onClick={async () => {
              await handleSaveClick();
            }}
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
