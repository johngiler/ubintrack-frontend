"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import {
  updateClient,
  createClient,
  createBranch,
  updateBranch,
  deleteBranch,
  updateClientUser,
  createClientUser,
} from "@/services/coreService";
import { getTariffs } from "@/services/financeService";
import ClientBranches from "./ClientBranches";
import ClientUsers from "./ClientUsers";

const EMPTY_CLIENT = {
  name: "",
  company: "",
  address: "",
  ruc: "",
  dv: "",
  cold_positions: 0,
  frozen_positions: 0,
  is_active: true,
  tariff: null,
  branches: [],
  users: [],
};

function isBlank(value) {
  return !String(value ?? "").trim();
}

function cleanBranchForApi(branch, clientId) {
  const { temp_id, ...data } = branch;
  return { ...data, client: clientId };
}

export default function ModalEdit({ show, onHide, client, mode, onSave, showAlert }) {
  const navigate = useWmsNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_CLIENT);
  const [originalBranches, setOriginalBranches] = useState([]);
  const [tariffOptions, setTariffOptions] = useState([]);
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState(false);
  const [branchFormErrors, setBranchFormErrors] = useState(false);
  const [clientFormErrors, setClientFormErrors] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";
  const hasTariffs = tariffOptions.length > 0;

  const renderNoTariffsAlert = () => (
    <Alert variant="warning" className="mb-0 text-sm">
      <p className="mb-2">
        No hay tarifas disponibles. Debe crear al menos una tarifa antes de registrar clientes.
      </p>
      <Button
        variant="outline"
        size="sm"
        icon={ExternalLink}
        onClick={() => navigate("/finance/tariffs?new=1")}
      >
        Ir a crear tarifa
      </Button>
    </Alert>
  );

  useEffect(() => {
    if (!show || readOnly) return undefined;

    let cancelled = false;
    setIsLoadingTariffs(true);

    getTariffs(1, "")
      .then((response) => {
        if (cancelled) return;
        setTariffOptions(
          (response.results || []).map((tariff) => ({
            value: tariff.id,
            label: tariff.name,
          })),
        );
      })
      .catch((error) => {
        console.error("Error al cargar tarifas:", error);
        if (!cancelled) setTariffOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTariffs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, readOnly]);

  useEffect(() => {
    if (client) {
      setFormData({
        ...client,
        users: client.client_users || client.users || [],
        branches: client.branches || [],
      });
      setOriginalBranches(client.branches || []);
    } else {
      setFormData(EMPTY_CLIENT);
      setOriginalBranches([]);
    }
    if (!show) {
      setUserFormErrors(false);
      setBranchFormErrors(false);
      setClientFormErrors(false);
    }
  }, [client, show]);

  const handleSave = async () => {
    const clientFieldsMissing =
      isBlank(formData.name) ||
      isBlank(formData.company) ||
      isBlank(formData.address) ||
      isBlank(formData.ruc) ||
      isBlank(formData.dv) ||
      !formData.tariff?.id;

    if (clientFieldsMissing) {
      setClientFormErrors(true);
      if (!formData.tariff?.id) {
        showAlert(
          "danger",
          hasTariffs
            ? "Seleccione una tarifa para el cliente."
            : "Debe crear una tarifa antes de registrar clientes.",
        );
      } else {
        showAlert(
          "danger",
          "Complete los datos obligatorios del cliente: nombre, empresa, dirección, RUC y DV.",
        );
      }
      return;
    }

    setClientFormErrors(false);

    const invalidBranch = (formData.branches || []).find(
      (branch) => isBlank(branch.name) || isBlank(branch.address),
    );

    if (invalidBranch) {
      setBranchFormErrors(true);
      showAlert("danger", "Complete el nombre y la dirección de cada sucursal.");
      return;
    }

    setBranchFormErrors(false);

    const invalidUser = (formData.users || []).find((user) => {
      if (isBlank(user.full_name)) return true;
      if (isBlank(user.email)) return true;
      if (!user.profile_id) return true;
      if (!user.id && isBlank(user.plain_password)) return true;
      return false;
    });

    if (invalidUser) {
      setUserFormErrors(true);
      if (!invalidUser.profile_id) {
        showAlert("danger", "Asigne un perfil a cada usuario del cliente.");
      } else if (!invalidUser.id && isBlank(invalidUser.plain_password)) {
        showAlert("danger", "La contraseña es obligatoria para usuarios nuevos.");
      } else {
        showAlert("danger", "Complete todos los campos obligatorios de cada usuario del cliente.");
      }
      return;
    }

    setUserFormErrors(false);
    setIsSaving(true);
    try {
      const clientData = {
        ...formData,
        tariff_id: formData.tariff?.id || null,
        tariff: undefined,
        branches: undefined,
        users: undefined,
        client_users: undefined,
      };

      let savedClient;
      if (formData.id) {
        savedClient = await updateClient(formData.id, clientData);
      } else {
        savedClient = await createClient(clientData);
      }

      const branchPromises = [];

      for (const branch of formData.branches || []) {
        if (branch.id && !branch.temp_id) {
          branchPromises.push(updateBranch(branch.id, cleanBranchForApi(branch, savedClient.id)));
        } else {
          branchPromises.push(createBranch(cleanBranchForApi(branch, savedClient.id)));
        }
      }

      const currentBranchIds = (formData.branches || [])
        .filter((b) => b.id && !b.temp_id)
        .map((b) => b.id);

      const branchesToDelete = originalBranches
        .filter((b) => b.id && !currentBranchIds.includes(b.id))
        .map((b) => deleteBranch(b.id));

      const userPromises = [];
      for (const user of formData.users || []) {
        if (user.id && !user.temp_id) {
          userPromises.push(
            updateClientUser(user.id, {
              full_name: user.full_name,
              email: user.email,
              client_id: savedClient.id,
              profile_id: user.profile_id,
              is_active: user.is_active,
              ...(user.plain_password ? { plain_password: user.plain_password } : {}),
            }),
          );
        } else {
          userPromises.push(
            createClientUser({
              full_name: user.full_name,
              email: user.email,
              plain_password: user.plain_password,
              client_id: savedClient.id,
              profile_id: user.profile_id,
              is_active: user.is_active,
            }),
          );
        }
      }

      await Promise.all([...branchPromises, ...branchesToDelete, ...userPromises]);

      await onSave();
      onHide();
      showAlert("success", "Cliente, sucursales y usuarios guardados exitosamente");
    } catch (error) {
      console.error("Error al guardar:", error);
      showAlert("danger", "Error al guardar el cliente, sucursales o usuarios");
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly
    ? "Ver cliente"
    : formData?.id
      ? "Editar cliente"
      : "Nuevo cliente";

  const isClientFieldInvalid = (field) => {
    if (!clientFormErrors) return false;
    if (field === "tariff") return !formData.tariff?.id;
    return isBlank(formData[field]);
  };

  return (
    <Modal show={show} onHide={onHide} size="full">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-y-auto">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Modal.Section title="Datos del cliente" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Nombre <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    isInvalid={isClientFieldInvalid("name")}
                    value={formData.name || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {isClientFieldInvalid("name") && (
                    <Form.Text className="text-danger">El nombre es obligatorio.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Empresa <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    isInvalid={isClientFieldInvalid("company")}
                    value={formData.company || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                  {isClientFieldInvalid("company") && (
                    <Form.Text className="text-danger">La empresa es obligatoria.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Dirección <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    isInvalid={isClientFieldInvalid("address")}
                    value={formData.address || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                  {isClientFieldInvalid("address") && (
                    <Form.Text className="text-danger">La dirección es obligatoria.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <div className="grid grid-cols-12 gap-2">
                  <Form.Group className="col-span-8 mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      RUC <span className="text-red-500">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      isInvalid={isClientFieldInvalid("ruc")}
                      value={formData.ruc || ""}
                      readOnly={readOnly}
                      onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    />
                    {isClientFieldInvalid("ruc") && (
                      <Form.Text className="text-danger">El RUC es obligatorio.</Form.Text>
                    )}
                  </Form.Group>
                  <Form.Group className="col-span-4 mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      DV <span className="text-red-500">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      isInvalid={isClientFieldInvalid("dv")}
                      value={formData.dv || ""}
                      readOnly={readOnly}
                      onChange={(e) => setFormData({ ...formData, dv: e.target.value })}
                    />
                    {isClientFieldInvalid("dv") && (
                      <Form.Text className="text-danger">El DV es obligatorio.</Form.Text>
                    )}
                  </Form.Group>
                </div>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Posiciones frías
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.cold_positions ?? 0}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, cold_positions: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Posiciones congeladas
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.frozen_positions ?? 0}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        frozen_positions: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group controlId="tariff-select" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Tarifa {!readOnly && <span className="text-red-500">*</span>}
                  </Form.Label>
                  {readOnly ? (
                    <Form.Control value={formData.tariff?.name || "Sin tarifa"} readOnly />
                  ) : isLoadingTariffs ? (
                    <Form.Control value="Cargando tarifas…" readOnly disabled />
                  ) : !hasTariffs ? (
                    renderNoTariffsAlert()
                  ) : (
                    <>
                      <Select
                        inputId="tariff-select"
                        id="tariff-select"
                        name="tariff"
                        options={tariffOptions}
                        value={formData.tariff?.id ?? ""}
                        isSearchable
                        placeholder="Seleccione una tarifa"
                        noOptionsMessage={() => "No hay tarifas disponibles"}
                        isInvalid={isClientFieldInvalid("tariff")}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selected = tariffOptions.find(
                            (option) => String(option.value) === String(selectedId),
                          );
                          setFormData({
                            ...formData,
                            tariff: selected
                              ? { id: selected.value, name: selected.label }
                              : null,
                          });
                        }}
                      />
                      {isClientFieldInvalid("tariff") && (
                        <Form.Text className="text-danger">
                          Debe seleccionar una tarifa para el cliente.
                        </Form.Text>
                      )}
                    </>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Estado</Form.Label>
                  <Form.Check
                    type="switch"
                    id="client-is-active"
                    label={formData.is_active ? "Activo" : "Inactivo"}
                    checked={formData.is_active}
                    disabled={readOnly}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Section>

          <Modal.Section title="Sucursales" className="!p-3.5">
            <ClientBranches
              branches={formData.branches || []}
              onChange={(branches) => setFormData((prev) => ({ ...prev, branches }))}
              readOnly={readOnly}
              showValidation={branchFormErrors}
            />
          </Modal.Section>

          <Modal.Section title="Usuarios del cliente" className="!p-3.5">
            <ClientUsers
              users={formData.users || []}
              onChange={(users) => setFormData((prev) => ({ ...prev, users }))}
              readOnly={readOnly}
              validateProfiles={userFormErrors}
            />
          </Modal.Section>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          Cerrar
        </Button>
        {isEditMode && (
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            disabled={isSaving || isLoadingTariffs || (!readOnly && !hasTariffs)}
            loading={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
