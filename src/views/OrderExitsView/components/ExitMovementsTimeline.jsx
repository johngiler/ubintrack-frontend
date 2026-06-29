"use client";

import React, { useEffect, useState } from "react";
import { Badge, Spinner } from "@/components/ui/bootstrap";
import Link from "next/link";
import { useWmsNavigate, useWmsSearchParams } from "@/hooks/useWmsRouter";
import { getExitMovements } from "@/services/orderService";
import { formatDateTime } from "@/lib/format";

const ExitMovementsTimeline = ({ exitId }) => {
  const [movements, setMovements] = useState([]);
  const [exitInfo, setExitInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (exitId) {
      loadMovements();
    }
  }, [exitId]);

  const loadMovements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExitMovements(exitId);
      setMovements(data.movements || []);
      setExitInfo({ exit_id: data.exit_id, exit_code: data.exit_code });
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      setError("Error al cargar el historial de movimientos");
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = (movementType) => {
    const iconMap = {
      created: "ri-add-circle-line text-success",
      import_created: "ri-file-upload-line text-success",
      status_changed: "ri-refresh-line text-primary",
      product_added: "ri-add-box-line text-info",
      product_removed: "ri-delete-bin-line text-danger",
      bin_assigned: "ri-archive-line text-info",
      bin_removed: "ri-archive-line text-danger",
      bin_processed: "ri-checkbox-circle-line text-warning",
      bin_reversed: "ri-arrow-go-back-line text-info",
      bin_replaced: "ri-exchange-line text-primary",
      bin_reassigned: "ri-shuffle-line text-primary",
      quantity_changed: "ri-scales-line text-warning",
      conflict_detected: "ri-error-warning-line text-danger",
      conflict_resolved: "ri-check-double-line text-success",
    };
    return iconMap[movementType] || "ri-information-line text-secondary";
  };

  const getMovementTypeLabel = (movementType) => {
    const labelMap = {
      created: "Orden Creada",
      import_created: "Creada por Importación",
      status_changed: "Cambio de Estado",
      product_added: "Producto Agregado",
      product_removed: "Producto Eliminado",
      bin_assigned: "Bin Asignado",
      bin_removed: "Bin Eliminado",
      bin_processed: "Bin Procesado",
      bin_reversed: "Bin Reversado",
      bin_replaced: "Bin Reemplazado",
      bin_reassigned: "Bin Reasignado",
      quantity_changed: "Cantidad Modificada",
      conflict_detected: "Conflicto Detectado",
      conflict_resolved: "Conflicto Resuelto",
    };
    return labelMap[movementType] || movementType;
  };

  const getStatusBadgeVariant = (status) => {
    const statusMap = {
      pendiente: "warning",
      en_progreso: "primary",
      completada: "success",
      cancelada: "danger",
    };
    return statusMap[status] || "secondary";
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pendiente: "Pendiente",
      en_progreso: "En Progreso",
      completada: "Completada",
      cancelada: "Cancelada",
    };
    return statusMap[status] || status;
  };

  const getBorderColor = (movementType) => {
    const colorMap = {
      created: "#28a745",
      import_created: "#28a745",
      status_changed: "#007bff",
      product_added: "#17a2b8",
      product_removed: "#dc3545",
      bin_assigned: "#17a2b8",
      bin_removed: "#dc3545",
      bin_processed: "#ffc107",
      bin_reversed: "#17a2b8",
      bin_replaced: "#007bff",
      bin_reassigned: "#007bff",
      quantity_changed: "#ffc107",
      conflict_detected: "#dc3545",
      conflict_resolved: "#28a745",
    };
    return colorMap[movementType] || "#dee2e6";
  };

  // Componente para mostrar Producto - SKU con link
  const ProductLink = ({ productName, productSku }) => {
    if (!productName) return <span className="text-muted">-</span>;

    return (
      <div className="d-flex align-items-center gap-1 flex-wrap">
        <span className="fw-medium">{productName}</span>
        {productSku && (
          <Link
            href={`/inventory/products?search=${productSku}`}
            className="text-decoration-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge bg="light" text="dark" className="border">
              SKU: {productSku}
              <i className="ri-external-link-line ms-1"></i>
            </Badge>
          </Link>
        )}
      </div>
    );
  };

  // Componente para mostrar un campo con etiqueta
  const InfoField = ({ label, children, className = "" }) => (
    <div className={`mb-2 ${className}`}>
      <small className="text-muted d-block">{label}</small>
      <div>{children}</div>
    </div>
  );

  // Componente para mostrar link de bin
  const BinLink = ({ binCode }) => {
    if (!binCode) return <span className="text-muted">-</span>;
    return (
      <Link
        href={`/inventory/bins?bin_code=${binCode}`}
        className="text-decoration-none"
        onClick={(e) => e.stopPropagation()}
      >
        <Badge bg="dark">
          {binCode}
          <i className="ri-external-link-line ms-1"></i>
        </Badge>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" className="me-2" />
        <span>Cargando historial de movimientos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <i className="ri-inbox-line fs-1 mb-2 d-block"></i>
        <p>No hay movimientos registrados para esta orden de salida</p>
      </div>
    );
  }

  return (
    <div className="exit-movements-timeline">
      <style>{`
        .exit-movements-timeline {
          position: relative;
          padding-left: 1.5rem;
        }
        
        @media (min-width: 576px) {
          .exit-movements-timeline {
            padding-left: 2rem;
          }
        }
        
        .timeline-item {
          position: relative;
          padding-bottom: 1.5rem;
        }
        
        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: -1rem;
          top: 2rem;
          bottom: -0.5rem;
          width: 2px;
          background-color: #dee2e6;
        }
        
        @media (min-width: 576px) {
          .timeline-item:not(:last-child)::before {
            left: -1.5rem;
          }
        }
        
        .timeline-icon {
          position: absolute;
          left: -1.5rem;
          top: 0.25rem;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: white;
          border-radius: 50%;
          z-index: 1;
        }
        
        @media (min-width: 576px) {
          .timeline-icon {
            left: -2rem;
            width: 2rem;
            height: 2rem;
          }
        }
        
        .timeline-content {
          background-color: #f8f9fa;
          border-radius: 0.5rem;
          padding: 0.75rem;
          border-left: 4px solid #dee2e6;
        }
        
        @media (min-width: 576px) {
          .timeline-content {
            padding: 1rem;
          }
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }

        @media (min-width: 576px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 768px) {
          .info-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .link-badge {
          cursor: pointer;
          transition: all 0.2s;
        }

        .link-badge:hover {
          opacity: 0.8;
          transform: translateY(-1px);
        }
      `}</style>

      {movements.map((movement) => (
        <div key={movement.id} className="timeline-item">
          <div className="timeline-icon">
            <i
              className={`${getMovementIcon(movement.movement_type)} fs-5`}
            ></i>
          </div>

          <div
            className="timeline-content"
            style={{
              borderLeftColor: getBorderColor(movement.movement_type),
            }}
          >
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start mb-3 gap-2">
              <div>
                <h6 className="mb-1 fw-bold">
                  {getMovementTypeLabel(movement.movement_type)}
                </h6>
                <small className="text-muted d-block">
                  <i className="ri-calendar-line me-1"></i>
                  {formatDateTime(movement.created_at)}
                </small>
                {movement.client_name && (
                  <small className="text-muted d-block">
                    <i className="ri-building-line me-1"></i>
                    {movement.client_name}
                  </small>
                )}
              </div>
              {movement.created_by && (
                <div className="text-start text-sm-end">
                  <small className="text-muted">
                    <i className="ri-user-line me-1"></i>
                    {movement.created_by.full_name ||
                      movement.created_by.username}
                  </small>
                </div>
              )}
            </div>

            {/* ORDEN CREADA */}
            {(movement.movement_type === "created" ||
              movement.movement_type === "import_created") && (
              <div className="info-grid">
                <InfoField label="Estado Inicial">
                  <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                    {getStatusLabel(movement.new_status)}
                  </Badge>
                </InfoField>
                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* CAMBIO DE ESTADO */}
            {movement.movement_type === "status_changed" && (
              <div>
                <InfoField label="Cambio de Estado">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Badge bg={getStatusBadgeVariant(movement.old_status)}>
                      {getStatusLabel(movement.old_status)}
                    </Badge>
                    <i className="ri-arrow-right-line text-muted"></i>
                    <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                      {getStatusLabel(movement.new_status)}
                    </Badge>
                  </div>
                </InfoField>
                {movement.notes && (
                  <InfoField label="Detalle">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* BIN PROCESADO */}
            {movement.movement_type === "bin_processed" && (
              <div className="info-grid">
                <InfoField label="Bin">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <BinLink binCode={movement.bin_code} />
                    {movement.is_picking ? (
                      <Badge bg="warning" text="dark">
                        Picking
                      </Badge>
                    ) : (
                      <Badge bg="success">Completo</Badge>
                    )}
                  </div>
                </InfoField>

                <InfoField label="Producto">
                  <ProductLink
                    productName={movement.product_name}
                    productSku={movement.product_sku}
                  />
                </InfoField>

                {movement.quantity !== null && (
                  <InfoField label="Cantidad Procesada">
                    <strong className="text-warning">
                      {movement.quantity} unidades
                    </strong>
                  </InfoField>
                )}

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* BIN REVERSADO */}
            {movement.movement_type === "bin_reversed" && (
              <div className="info-grid">
                <InfoField label="Bin Reversado">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <BinLink binCode={movement.bin_code} />
                    <Badge bg="secondary">
                      <i className="ri-arrow-go-back-line me-1"></i>
                      Reversión
                    </Badge>
                  </div>
                </InfoField>

                <InfoField label="Producto">
                  <ProductLink
                    productName={movement.product_name}
                    productSku={movement.product_sku}
                  />
                </InfoField>

                {movement.quantity !== null && (
                  <InfoField label="Cantidad Restaurada">
                    <strong className="text-info">
                      +{movement.quantity} unidades
                    </strong>
                  </InfoField>
                )}

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* BIN REEMPLAZADO */}
            {movement.movement_type === "bin_replaced" && (
              <div className="info-grid">
                <InfoField label="Reemplazo de Bin">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <BinLink binCode={movement.old_bin_code} />
                    <i className="ri-arrow-right-line text-muted"></i>
                    <BinLink binCode={movement.new_bin_code} />
                  </div>
                </InfoField>

                <InfoField label="Producto">
                  <ProductLink
                    productName={movement.product_name}
                    productSku={movement.product_sku}
                  />
                </InfoField>

                {movement.quantity !== null && (
                  <InfoField label="Cantidad">
                    <strong>{movement.quantity} unidades</strong>
                  </InfoField>
                )}

                {movement.metadata?.merged && (
                  <InfoField label="Tipo">
                    <Badge bg="info">
                      <i className="ri-merge-cells-horizontal me-1"></i>
                      Fusionado
                    </Badge>
                  </InfoField>
                )}

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* BIN REASIGNADO */}
            {movement.movement_type === "bin_reassigned" && (
              <div className="info-grid">
                <InfoField label="Reasignación de Bin">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <BinLink binCode={movement.old_bin_code} />
                    <i className="ri-arrow-right-line text-muted"></i>
                    <BinLink binCode={movement.new_bin_code} />
                  </div>
                </InfoField>

                <InfoField label="Producto">
                  <ProductLink
                    productName={movement.product_name}
                    productSku={movement.product_sku}
                  />
                </InfoField>

                {movement.quantity !== null && (
                  <InfoField label="Cantidad">
                    <strong>{movement.quantity} unidades</strong>
                  </InfoField>
                )}

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* CONFLICTO DETECTADO/RESUELTO */}
            {(movement.movement_type === "conflict_detected" ||
              movement.movement_type === "conflict_resolved") && (
              <div className="info-grid">
                {movement.bin_code && (
                  <InfoField label="Bin">
                    <BinLink binCode={movement.bin_code} />
                  </InfoField>
                )}

                {movement.product_name && (
                  <InfoField label="Producto">
                    <ProductLink
                      productName={movement.product_name}
                      productSku={movement.product_sku}
                    />
                  </InfoField>
                )}

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* Fallback para otros tipos de movimiento */}
            {![
              "created",
              "import_created",
              "status_changed",
              "bin_processed",
              "bin_reversed",
              "bin_replaced",
              "bin_reassigned",
              "conflict_detected",
              "conflict_resolved",
            ].includes(movement.movement_type) && (
              <div className="info-grid">
                {movement.bin_code && (
                  <InfoField label="Bin">
                    <BinLink binCode={movement.bin_code} />
                  </InfoField>
                )}

                {movement.product_name && (
                  <InfoField label="Producto">
                    <ProductLink
                      productName={movement.product_name}
                      productSku={movement.product_sku}
                    />
                  </InfoField>
                )}

                {movement.quantity !== null && (
                  <InfoField label="Cantidad">
                    <strong>{movement.quantity} unidades</strong>
                  </InfoField>
                )}

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExitMovementsTimeline;
