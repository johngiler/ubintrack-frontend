"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

import { Alert, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import ReadOnlyDetail from "./ReadOnlyDetail";

function isBlank(value) {
  return !String(value ?? "").trim();
}

function isBranchFieldInvalid(branch, field, showValidation) {
  if (!showValidation) return false;
  if (field === "name") return isBlank(branch.name);
  if (field === "address") return isBlank(branch.address);
  return false;
}

export default function ClientBranches({ branches, onChange, readOnly, showValidation = false }) {
  const [expandedBranch, setExpandedBranch] = useState(null);

  const handleAddBranch = () => {
    const newIndex = branches.length;
    onChange([
      ...branches,
      {
        temp_id: Date.now(),
        name: "",
        address: "",
        longitude: "",
        latitude: "",
        map_link: "",
        is_active: true,
      },
    ]);
    setExpandedBranch(newIndex);
  };

  const handleUpdateBranch = (index, field, value) => {
    const newBranches = [...branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    onChange(newBranches);
  };

  const handleRemoveBranch = (index) => {
    onChange(branches.filter((_, i) => i !== index));
    if (expandedBranch === index) setExpandedBranch(null);
  };

  const renderBranchForm = (branch, index) => {
    const isExpanded = expandedBranch === index;
    const nameMissing = isBranchFieldInvalid(branch, "name", showValidation);
    const addressMissing = isBranchFieldInvalid(branch, "address", showValidation);

    return (
      <div
        key={branch.id || branch.temp_id}
        className="mb-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white"
      >
        <div
          className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-50/80"
          onClick={() => setExpandedBranch(isExpanded ? null : index)}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className="text-sm font-semibold text-slate-800">Sucursal {index + 1}</span>
            <span className="truncate text-sm text-slate-500">{branch.name || "Sin nombre"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={branch.is_active ? "success" : "danger"} dot={false}>
              {branch.is_active ? "Activo" : "Inactivo"}
            </Badge>
            <IconButton
              size="sm"
              className="text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveBranch(index);
              }}
              title="Eliminar sucursal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-slate-100 px-3 py-3">
            <Row className="gap-y-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Nombre <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    isInvalid={nameMissing}
                    value={branch.name}
                    onChange={(e) => handleUpdateBranch(index, "name", e.target.value)}
                  />
                  {nameMissing && (
                    <Form.Text className="text-danger">El nombre es obligatorio.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Dirección <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    isInvalid={addressMissing}
                    value={branch.address}
                    onChange={(e) => handleUpdateBranch(index, "address", e.target.value)}
                  />
                  {addressMissing && (
                    <Form.Text className="text-danger">La dirección es obligatoria.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Longitud</Form.Label>
                  <Form.Control
                    value={branch.longitude}
                    onChange={(e) => handleUpdateBranch(index, "longitude", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Latitud</Form.Label>
                  <Form.Control
                    value={branch.latitude}
                    onChange={(e) => handleUpdateBranch(index, "latitude", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Link del mapa</Form.Label>
                  <Form.Control
                    value={branch.map_link}
                    onChange={(e) => handleUpdateBranch(index, "map_link", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check
                  type="switch"
                  id={`branch-active-${branch.id || branch.temp_id}`}
                  label={branch.is_active ? "Activo" : "Inactivo"}
                  checked={branch.is_active}
                  onChange={(e) => handleUpdateBranch(index, "is_active", e.target.checked)}
                />
              </Col>
            </Row>
          </div>
        )}
      </div>
    );
  };

  const renderBranchCard = (branch, index) => {
    const hasCoordinates = Boolean(branch.latitude && branch.longitude);

    return (
      <article
        key={branch.id || branch.temp_id}
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h6 className="mb-0 truncate text-sm font-semibold text-slate-900">
                {branch.name || "—"}
              </h6>
              <p className="mb-0 text-xs text-slate-500">Sucursal {index + 1}</p>
            </div>
          </div>
          <Badge variant={branch.is_active ? "success" : "danger"} dot={false}>
            {branch.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        <div
          className={
            hasCoordinates
              ? "grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_240px]"
              : "p-4"
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyDetail label="Dirección" value={branch.address} className="sm:col-span-2" />
            <ReadOnlyDetail label="Longitud" value={branch.longitude} />
            <ReadOnlyDetail label="Latitud" value={branch.latitude} />
            {branch.map_link && (
              <ReadOnlyDetail label="Mapa" className="sm:col-span-2">
                <a
                  href={branch.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir en Google Maps
                </a>
              </ReadOnlyDetail>
            )}
          </div>

          {hasCoordinates && (
            <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
              <iframe
                width="100%"
                height="160"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${branch.latitude},${branch.longitude}&z=15&output=embed`}
                allowFullScreen
                title={`Mapa ${branch.name}`}
              />
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        {!readOnly && (
          <Button variant="primary" size="sm" icon={Plus} onClick={handleAddBranch}>
            Agregar sucursal
          </Button>
        )}
      </div>

      {branches.length > 0 ? (
        readOnly ? (
          <div className="space-y-3">{branches.map((branch, index) => renderBranchCard(branch, index))}</div>
        ) : (
          branches.map((branch, index) => renderBranchForm(branch, index))
        )
      ) : (
        <Alert variant="info" className="mb-0 text-sm">
          No hay sucursales registradas
        </Alert>
      )}
    </>
  );
}
