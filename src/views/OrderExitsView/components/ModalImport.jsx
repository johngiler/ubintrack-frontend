"use client";

import React, { useState, useRef } from "react";
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
  Card,
  Table,
} from "@/components/ui/bootstrap";
import VisibleSliceList from "@/components/ui/VisibleSliceList";
import {
  validateExitImport,
  importExitsFromExcel,
} from "@/services/orderService";


const ModalImport = ({ showModal, handleCloseModal, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [exitDateOverride, setExitDateOverride] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    setValidationResult(null);
    setImportResult(null);

    try {
      const result = await validateExitImport(file);
      setValidationResult(result);
    } catch (error) {
      console.error("Error validating file:", error);
      // Extraer errores de la respuesta del backend
      let errorMessages = [];
      if (error.response?.data) {
        const data = error.response.data;
        if (data.errors && Array.isArray(data.errors)) {
          errorMessages = data.errors;
        } else if (data.error) {
          errorMessages = [data.error];
        } else if (typeof data === "string") {
          errorMessages = [data];
        } else if (data.detail) {
          errorMessages = [data.detail];
        }
      }
      if (errorMessages.length === 0) {
        errorMessages = [error.message || "Error al validar el archivo"];
      }
      setValidationResult({
        valid: false,
        errors: errorMessages,
        warnings: [],
        summary: null,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !validationResult?.valid) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importExitsFromExcel(file, exitDateOverride || null);
      setImportResult(result);
      if (result.success && onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error("Error importing file:", error);
      // Extraer errores de la respuesta del backend
      let errorMessages = [];
      let errorMessage = "Error al importar";
      if (error.response?.data) {
        const data = error.response.data;
        if (data.errors && Array.isArray(data.errors)) {
          errorMessages = data.errors;
        }
        if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      }
      if (errorMessages.length === 0 && error.message) {
        errorMessages = [error.message];
      }
      setImportResult({
        success: false,
        message: errorMessage,
        errors: errorMessages,
        created_orders: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setExitDateOverride("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    handleCloseModal();
  };

  const resetForm = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setExitDateOverride("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Modal show={showModal} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="">
        <Modal.Title>
          <i className="ri-file-upload-line me-2"></i>
          Importar Órdenes de Salida
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Resultado de importación exitosa */}
        {importResult?.success && (
          <Alert variant="success" className="mb-4">
            <Alert.Heading>
              <i className="ri-check-double-line me-2"></i>
              ¡Importación Exitosa!
            </Alert.Heading>
            <p>{importResult.message}</p>
            {importResult.created_orders?.length > 0 && (
              <div className="mt-3">
                <strong>Órdenes creadas:</strong>
                <Table size="sm" className="mt-2 mb-0">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Sucursal</th>
                      <th>Fecha</th>
                      <th>Productos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.created_orders.map((order, idx) => (
                      <tr key={idx}>
                        <td>
                          <Badge bg="primary">{order.code}</Badge>
                        </td>
                        <td>{order.branch}</td>
                        <td>{order.exit_date}</td>
                        <td>{order.products_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
            <hr />
            <Button variant="outline-success" size="sm" onClick={resetForm}>
              <i className="ri-add-line me-1"></i>
              Importar más
            </Button>
          </Alert>
        )}

        {/* Formulario de carga */}
        {!importResult?.success && (
          <>
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="ri-file-excel-2-line me-2 text-success"></i>
                Archivo Excel (.xlsx)
              </Form.Label>
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={isValidating || isImporting}
              />
              <Form.Text className="text-muted">
                El archivo debe ser formato .xlsx y contener las columnas:
                CLIENTE, Sucursal, CODIGO SKU, CANTIDAD. La columna DESCRIPCION
                puede contener la fecha de despacho.
              </Form.Text>
            </Form.Group>

            {/* Campo opcional para fecha de salida */}
            {validationResult?.valid && (
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">
                  <i className="ri-calendar-line me-2"></i>
                  Fecha de salida (opcional)
                </Form.Label>
                <Form.Control
                  type="date"
                  value={exitDateOverride}
                  onChange={(e) => setExitDateOverride(e.target.value)}
                  disabled={isImporting}
                />
                <Form.Text className="text-muted">
                  Si se especifica, se usará esta fecha para todas las órdenes.
                  De lo contrario, se usará la fecha del Excel o la fecha
                  actual.
                </Form.Text>
              </Form.Group>
            )}

            {/* Botón de validación */}
            {file && !validationResult && (
              <div className="d-grid mb-4">
                <Button
                  variant="outline-primary"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Validando archivo...
                    </>
                  ) : (
                    <>
                      <i className="ri-search-eye-line me-2"></i>
                      Validar Archivo
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Errores de validación */}
            {validationResult && !validationResult.valid && (
              <Alert variant="danger" className="mb-4">
                <div className="d-flex justify-content-between align-items-start">
                  <Alert.Heading className="mb-0">
                    <i className="ri-error-warning-line me-2"></i>
                    Errores de Validación
                  </Alert.Heading>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="p-1 lh-1"
                    title="Copiar errores"
                    onClick={() => {
                      const errorsText = validationResult.errors.join("\n");
                      navigator.clipboard.writeText(errorsText);
                    }}
                  >
                    <i className="ri-clipboard-line"></i>
                  </Button>
                </div>
                <p className="mb-2 mt-2">
                  Se encontraron los siguientes errores en el archivo:
                </p>
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    fontSize: "0.9em",
                  }}
                >
                  <ul className="mb-0">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
                <hr />
                <Button variant="outline-danger" size="sm" onClick={resetForm}>
                  <i className="ri-refresh-line me-1"></i>
                  Subir otro archivo
                </Button>
              </Alert>
            )}

            {/* Warnings */}
            {validationResult?.warnings?.length > 0 && (
              <Alert variant="warning" className="mb-4">
                <Alert.Heading className="h6">
                  <i className="ri-alert-line me-2"></i>
                  Advertencias
                </Alert.Heading>
                <ul className="mb-0 small">
                  {validationResult.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Resumen de validación exitosa */}
            {validationResult?.valid && validationResult?.summary && (
              <Card className="mb-4 border-success">
                <Card.Header className="bg-success text-white">
                  <i className="ri-check-line me-2"></i>
                  Validación Exitosa - Resumen de Importación
                </Card.Header>
                <Card.Body>
                  <div className="d-flex gap-4 mb-3 flex-wrap">
                    <div className="text-center">
                      <h3 className="text-secondary mb-0">
                        {validationResult.summary.total_rows}
                      </h3>
                      <small className="text-muted">Filas en Excel</small>
                    </div>
                    <div className="text-center d-flex align-items-center">
                      <i className="ri-arrow-right-line text-muted fs-4"></i>
                    </div>
                    <div className="text-center">
                      <h3 className="text-primary mb-0">
                        {validationResult.summary.total_orders}
                      </h3>
                      <small className="text-muted">Órdenes a crear</small>
                    </div>
                    <div className="text-center">
                      <h3 className="text-success mb-0">
                        {validationResult.summary.total_products}
                      </h3>
                      <small className="text-muted">Total productos</small>
                    </div>
                  </div>

                  <VisibleSliceList
                    items={validationResult.summary.orders || []}
                    itemLabel="órdenes"
                    className="max-h-[300px] overflow-y-auto"
                  >
                    {(visibleOrders) =>
                      visibleOrders.map((order, idx) => (
                        <Card key={idx} className="mb-2">
                          <Card.Body className="p-2">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div>
                                <strong>{order.client}</strong>
                                <span className="text-muted mx-2">→</span>
                                <Badge bg="info">{order.branch}</Badge>
                              </div>
                              <div>
                                <Badge bg="secondary">{order.exit_date}</Badge>
                                <Badge bg="primary" className="ms-2">
                                  {order.products_count} productos
                                </Badge>
                              </div>
                            </div>
                            <VisibleSliceList
                              items={order.products || []}
                              itemLabel="productos"
                              className="small"
                            >
                              {(visibleProducts) =>
                                visibleProducts.map((p, pIdx) => (
                                  <div key={pIdx} className="text-muted">
                                    • {p.sku}: {p.name} ({p.quantity})
                                  </div>
                                ))
                              }
                            </VisibleSliceList>
                          </Card.Body>
                        </Card>
                      ))
                    }
                  </VisibleSliceList>
                </Card.Body>
              </Card>
            )}

            {/* Error de importación */}
            {importResult && !importResult.success && (
              <Alert variant="danger" className="mb-4">
                <Alert.Heading>
                  <i className="ri-error-warning-line me-2"></i>
                  Error en la Importación
                </Alert.Heading>
                <p>{importResult.message}</p>
                {importResult.errors?.length > 0 && (
                  <ul className="mb-0">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                )}
              </Alert>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isImporting}
        >
          {importResult?.success ? "Cerrar" : "Cancelar"}
        </Button>

        {validationResult?.valid && !importResult?.success && (
          <Button
            variant="success"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Importando...
              </>
            ) : (
              <>
                <i className="ri-upload-2-line me-2"></i>
                Confirmar Importación
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ModalImport;
