"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  BinMovementIcon,
  inlineIconClass,
  TimelineBuilding,
  TimelineCalendar,
  TimelineCheckCircle,
  TimelineExternalLink,
  TimelineInbox,
  TimelineMapPin,
  TimelineUndo,
  TimelineUser,
} from "@/components/timeline/TimelineIcons";
import { Badge, Spinner } from "@/components/ui/bootstrap";
import VisibleSliceList from "@/components/ui/VisibleSliceList";
import { formatDateTime } from "@/lib/format";
import { getBinMovements } from "@/services/inventoryService";


const BinMovementsTimeline = ({ binId }) => {
  const [movements, setMovements] = useState([]);
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
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      setError("Error al cargar el historial de movimientos");
    } finally {
      setIsLoading(false);
    }
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
              <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
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
        <TimelineInbox className="mx-auto mb-2 h-10 w-10 text-slate-400" />
        <p>No hay movimientos registrados para este bin</p>
      </div>
    );
  }

  return (
    <VisibleSliceList items={movements} itemLabel="movimientos" className="wms-movements-timeline">
      {(visibleMovements) =>
        visibleMovements.map((movement) => (
        <div key={movement.id} className="timeline-item">
          <div className="timeline-icon">
            <BinMovementIcon
              movementType={movement.movement_type}
              newStatus={movement.new_status}
            />
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
                  <TimelineCalendar className={`${inlineIconClass} me-1`} />
                  {formatDateTime(movement.created_at)}
                </small>
                {movement.client_name && (
                  <small className="text-muted d-block">
                    <TimelineBuilding className={`${inlineIconClass} me-1`} />
                    {movement.client_name}
                  </small>
                )}
              </div>
              {movement.created_by && (
                <div className="text-start text-sm-end">
                  <small className="text-muted">
                    <TimelineUser className={`${inlineIconClass} me-1`} />
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
                      <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
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
                        <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
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
                      <ArrowRight className={`${inlineIconClass} text-muted`} />
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
                            <TimelineMapPin className={`${inlineIconClass} me-1`} />
                            {movement.position_code}
                            <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
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
                            <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
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
                            <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
                          </Badge>
                        </Link>
                      ) : (
                        <Badge bg="info">{movement.exit_code || "N/A"}</Badge>
                      )}
                      <Badge bg="secondary">
                        <TimelineUndo className={`${inlineIconClass} me-1`} />
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
                        <ArrowRight className={inlineIconClass} />
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
                      <ArrowRight className={`${inlineIconClass} text-muted`} />
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
                            <TimelineMapPin className={`${inlineIconClass} me-1`} />
                            {movement.position_code}
                            <TimelineExternalLink className={`${inlineIconClass} ms-1`} />
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
                      <ArrowRight className={`${inlineIconClass} text-muted`} />
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
                          <TimelineCheckCircle className={`${inlineIconClass} ms-1`} />
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
                      <ArrowRight className={`${inlineIconClass} text-muted`} />
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
      ))
      }
    </VisibleSliceList>
  );
};

export default BinMovementsTimeline;
