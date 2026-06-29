"use client";

import React, { useEffect, useState } from "react";
import { Badge, Spinner } from "@/components/ui/bootstrap";
import Link from "next/link";
import { useWmsNavigate, useWmsSearchParams } from "@/hooks/useWmsRouter";
import { getBinMovements } from "@/services/inventoryService";
import { formatDateTime } from "@/lib/format";

const BinMovementsTimeline = ({ binId }) => {
  const navigate = useWmsNavigate();
  const [movements, setMovements] = useState([]);
  const [binInfo, setBinInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (binId) {
      loadMovements();
    }
  }, [binId]);

  const loadMovements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBinMovements(binId);
      setMovements(data.movements || []);
      setBinInfo({ bin_id: data.bin_id, bin_code: data.bin_code });
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      setError("Error al cargar el historial de movimientos");
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = (movementType, newStatus) => {
    if (movementType === "created") {
      return "ri-add-circle-line text-success";
    }
    if (movementType === "exit_processed") {
      return "ri-subtract-line text-warning";
    }
    if (movementType === "exit_reversed") {
      return "ri-arrow-go-back-line text-info";
    }
    if (movementType === "status_changed") {
      if (newStatus === "almacenado") return "ri-archive-line text-primary";
      if (newStatus === "en_despacho") return "ri-truck-line text-info";
      if (newStatus === "despachado")
        return "ri-checkbox-circle-line text-secondary";
    }
    return "ri-information-line text-secondary";
  };

  const getMovementTypeLabel = (movementType, newStatus) => {
    if (movementType === "created") return "Bin Creado";
    if (movementType === "exit_processed") return "Salida Procesada";
    if (movementType === "exit_reversed") return "Salida Reversada";
    if (movementType === "status_changed") {
      if (newStatus === "almacenado") return "Cambio de Estado";
      if (newStatus === "en_despacho") return "Cambio de Estado";
      if (newStatus === "despachado") return "Cambio de Estado";
      return "Cambio de Estado";
    }
    return movementType;
  };

  const getStatusBadgeVariant = (status) => {
    const statusMap = {
      en_recibo: "warning",
      almacenado: "success",
      en_despacho: "primary",
      despachado: "secondary",
    };
    return statusMap[status] || "secondary";
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      en_recibo: "En Recibo",
      almacenado: "Almacenado",
      en_despacho: "En Despacho",
      despachado: "Despachado",
    };
    return statusMap[status] || status;
  };

  const getBorderColor = (movementType, newStatus) => {
    if (movementType === "created") return "#28a745";
    if (movementType === "exit_processed") return "#ffc107";
    if (movementType === "exit_reversed") return "#17a2b8";
    if (movementType === "status_changed") {
      if (newStatus === "almacenado") return "#007bff";
      if (newStatus === "en_despacho") return "#17a2b8";
      if (newStatus === "despachado") return "#6c757d";
    }
    return "#dee2e6";
  };

  // Componente para mostrar Producto - SKU con link
  const ProductLink = ({ productName, productSku, productId }) => {
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
        <p>No hay movimientos registrados para este bin</p>
      </div>
    );
  }

  return (
    <div className="bin-movements-timeline">
      <style>{`
        .bin-movements-timeline {
          position: relative;
          padding-left: 1.5rem;
        }
        
        @media (min-width: 576px) {
          .bin-movements-timeline {
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
              className={`${getMovementIcon(
                movement.movement_type,
                movement.new_status
              )} fs-5`}
            ></i>
          </div>

          <div
            className="timeline-content"
            style={{
              borderLeftColor: getBorderColor(
                movement.movement_type,
                movement.new_status
              ),
            }}
          >
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start mb-3 gap-2">
              <div>
                <h6 className="mb-1 fw-bold">
                  {getMovementTypeLabel(
                    movement.movement_type,
                    movement.new_status
                  )}
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
                      movement.created_by.email ||
                      movement.created_by.username}
                  </small>
                </div>
              )}
            </div>

            {/* BIN CREADO */}
            {movement.movement_type === "created" && (
              <div className="info-grid">
                <InfoField label="Estado Inicial">
                  <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                    {getStatusLabel(movement.new_status)}
                  </Badge>
                </InfoField>

                <InfoField label="Producto">
                  <ProductLink
                    productName={movement.product_name}
                    productSku={movement.product_sku}
                    productId={movement.product_id}
                  />
                </InfoField>

                <InfoField label="Bin Iniciado">
                  <Link
                    href={`/inventory/bins?search=${movement.bin_code}`}
                    className="text-decoration-none link-badge"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge bg="dark">
                      {movement.bin_code}
                      <i className="ri-external-link-line ms-1"></i>
                    </Badge>
                  </Link>
                </InfoField>

                {movement.initial_quantity !== null &&
                  movement.initial_quantity !== undefined && (
                    <InfoField label="Cantidad Inicial">
                      <strong className="text-success">
                        {movement.initial_quantity} {movement.product_uom || ""}
                      </strong>
                    </InfoField>
                  )}

                <InfoField label="Entrada">
                  {movement.entry_code ? (
                    <Link
                      href={`/order/entries?entry_code=${movement.entry_code}`}
                      className="text-decoration-none link-badge"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge bg="info">
                        {movement.entry_code}
                        <i className="ri-external-link-line ms-1"></i>
                      </Badge>
                    </Link>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </InfoField>

                {movement.notes && (
                  <InfoField label="Detalle" className="grid-column-span-full">
                    <p className="mb-0 small">{movement.notes}</p>
                  </InfoField>
                )}
              </div>
            )}

            {/* CAMBIO DE ESTADO - ALMACENADO */}
            {movement.movement_type === "status_changed" &&
              movement.new_status === "almacenado" && (
                <div>
                  <InfoField label="Movimiento de Estado">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                      <Badge bg={getStatusBadgeVariant(movement.old_status)}>
                        {getStatusLabel(movement.old_status)}
                      </Badge>
                      <i className="ri-arrow-right-line text-muted"></i>
                      <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                        {getStatusLabel(movement.new_status)}
                      </Badge>
                    </div>
                  </InfoField>

                  <div className="info-grid">
                    {movement.position_code && (
                      <InfoField label="Posición Asignada">
                        <Link
                          href={`/storage/positions?search=${movement.position_code}`}
                          className="text-decoration-none link-badge"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge bg="info">
                            <i className="ri-map-pin-line me-1"></i>
                            {movement.position_code}
                            <i className="ri-external-link-line ms-1"></i>
                          </Badge>
                        </Link>
                      </InfoField>
                    )}

                    <InfoField label="Producto">
                      <ProductLink
                        productName={movement.product_name}
                        productSku={movement.product_sku}
                        productId={movement.product_id}
                      />
                    </InfoField>

                    {movement.initial_quantity !== null &&
                      movement.initial_quantity !== undefined && (
                        <InfoField label="Cantidad Inicial">
                          <strong className="text-success">
                            {movement.initial_quantity}{" "}
                            {movement.product_uom || ""}
                          </strong>
                        </InfoField>
                      )}

                    {movement.notes && (
                      <InfoField
                        label="Detalle"
                        className="grid-column-span-full"
                      >
                        <p className="mb-0 small">{movement.notes}</p>
                      </InfoField>
                    )}
                  </div>
                </div>
              )}

            {/* SALIDA PROCESADA */}
            {movement.movement_type === "exit_processed" && (
              <div>
                <div className="info-grid">
                  <InfoField label="Salida">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {movement.exit_code && movement.exit?.id ? (
                        <Link
                          href={`/order/exits?exit_code=${movement.exit_code}`}
                          className="text-decoration-none link-badge"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge bg="info">
                            {movement.exit_code}
                            <i className="ri-external-link-line ms-1"></i>
                          </Badge>
                        </Link>
                      ) : (
                        <Badge bg="info">{movement.exit_code || "N/A"}</Badge>
                      )}
                      {/* Si quantity_remaining = 0, mostrar Completo aunque sea picking */}
                      {movement.is_picking &&
                      movement.quantity_remaining > 0 ? (
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
                      productId={movement.product_id}
                    />
                  </InfoField>

                  {movement.quantity_subtracted !== null && (
                    <InfoField label="Cantidad Restada">
                      <strong className="text-warning">
                        {movement.quantity_subtracted}{" "}
                        {movement.product_uom || ""}
                      </strong>
                    </InfoField>
                  )}

                  {movement.quantity_remaining !== null && (
                    <InfoField label="Cantidad Restante">
                      <strong className="text-success">
                        {movement.quantity_remaining}{" "}
                        {movement.product_uom || ""}
                      </strong>
                    </InfoField>
                  )}

                  {movement.notes && (
                    <InfoField
                      label="Detalle"
                      className="grid-column-span-full"
                    >
                      <p className="mb-0 small">{movement.notes}</p>
                    </InfoField>
                  )}
                </div>
              </div>
            )}

            {/* SALIDA REVERSADA */}
            {movement.movement_type === "exit_reversed" && (
              <div>
                <div className="info-grid">
                  <InfoField label="Salida Reversada">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {movement.exit_code && movement.exit?.id ? (
                        <Link
                          href={`/order/exits?exit_code=${movement.exit_code}`}
                          className="text-decoration-none link-badge"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge bg="info">
                            {movement.exit_code}
                            <i className="ri-external-link-line ms-1"></i>
                          </Badge>
                        </Link>
                      ) : (
                        <Badge bg="info">{movement.exit_code || "N/A"}</Badge>
                      )}
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
                      productId={movement.product_id}
                    />
                  </InfoField>

                  {movement.quantity_subtracted !== null && (
                    <InfoField label="Cantidad Restaurada">
                      <strong className="text-info">
                        +{movement.quantity_subtracted}{" "}
                        {movement.product_uom || ""}
                      </strong>
                    </InfoField>
                  )}

                  {movement.quantity_remaining !== null && (
                    <InfoField label="Cantidad Actual">
                      <strong className="text-success">
                        {movement.quantity_remaining}{" "}
                        {movement.product_uom || ""}
                      </strong>
                    </InfoField>
                  )}

                  {movement.position && (
                    <InfoField label="Posición Restaurada">
                      <PositionLink
                        positionCode={movement.position?.code}
                        positionId={movement.position?.id}
                      />
                    </InfoField>
                  )}

                  {movement.old_status && movement.new_status && (
                    <InfoField label="Estado">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Badge bg={getStatusBadgeVariant(movement.old_status)}>
                          {getStatusLabel(movement.old_status)}
                        </Badge>
                        <i className="ri-arrow-right-line"></i>
                        <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                          {getStatusLabel(movement.new_status)}
                        </Badge>
                      </div>
                    </InfoField>
                  )}

                  {movement.notes && (
                    <InfoField
                      label="Detalle"
                      className="grid-column-span-full"
                    >
                      <p className="mb-0 small">{movement.notes}</p>
                    </InfoField>
                  )}
                </div>
              </div>
            )}

            {/* CAMBIO DE ESTADO - EN DESPACHO */}
            {movement.movement_type === "status_changed" &&
              movement.new_status === "en_despacho" && (
                <div>
                  <InfoField label="Movimiento de Estado">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                      <Badge bg={getStatusBadgeVariant(movement.old_status)}>
                        {getStatusLabel(movement.old_status)}
                      </Badge>
                      <i className="ri-arrow-right-line text-muted"></i>
                      <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                        {getStatusLabel(movement.new_status)}
                      </Badge>
                    </div>
                  </InfoField>

                  <div className="info-grid">
                    {movement.position_code && (
                      <InfoField label="Posición Liberada">
                        <Link
                          href={`/storage/positions?search=${movement.position_code}`}
                          className="text-decoration-none link-badge"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge bg="secondary">
                            <i className="ri-map-pin-line me-1"></i>
                            {movement.position_code}
                            <i className="ri-external-link-line ms-1"></i>
                          </Badge>
                        </Link>
                      </InfoField>
                    )}

                    <InfoField label="Producto">
                      <ProductLink
                        productName={movement.product_name}
                        productSku={movement.product_sku}
                        productId={movement.product_id}
                      />
                    </InfoField>

                    {movement.notes && (
                      <InfoField
                        label="Detalle"
                        className="grid-column-span-full"
                      >
                        <p className="mb-0 small">{movement.notes}</p>
                      </InfoField>
                    )}
                  </div>
                </div>
              )}

            {/* CAMBIO DE ESTADO - DESPACHADO */}
            {movement.movement_type === "status_changed" &&
              movement.new_status === "despachado" && (
                <div>
                  <InfoField label="Movimiento de Estado">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                      <Badge bg={getStatusBadgeVariant(movement.old_status)}>
                        {getStatusLabel(movement.old_status)}
                      </Badge>
                      <i className="ri-arrow-right-line text-muted"></i>
                      <Badge bg={getStatusBadgeVariant(movement.new_status)}>
                        {getStatusLabel(movement.new_status)}
                      </Badge>
                    </div>
                  </InfoField>

                  <div className="info-grid">
                    <InfoField label="Bin Finalizado">
                      <Link
                        href={`/inventory/bins?search=${movement.bin_code}`}
                        className="text-decoration-none link-badge"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge bg="secondary">
                          {movement.bin_code}
                          <i className="ri-checkbox-circle-line ms-1"></i>
                        </Badge>
                      </Link>
                    </InfoField>

                    <InfoField label="Producto">
                      <ProductLink
                        productName={movement.product_name}
                        productSku={movement.product_sku}
                        productId={movement.product_id}
                      />
                    </InfoField>

                    {movement.notes && (
                      <InfoField
                        label="Detalle"
                        className="grid-column-span-full"
                      >
                        <p className="mb-0 small">{movement.notes}</p>
                      </InfoField>
                    )}
                  </div>
                </div>
              )}

            {/* Fallback para otros cambios de estado */}
            {movement.movement_type === "status_changed" &&
              !["almacenado", "en_despacho", "despachado"].includes(
                movement.new_status
              ) && (
                <div>
                  <InfoField label="Movimiento de Estado">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
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
                    <p className="mb-0 mt-2 small">{movement.notes}</p>
                  )}
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BinMovementsTimeline;
