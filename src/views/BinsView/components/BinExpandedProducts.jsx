"use client";

import { ExternalLink, QrCode } from "lucide-react";

import { Button } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { ConditionBadge } from "@/views/CavasView/cavaLabels";
import { formatDate } from "@/lib/format";
import { statusBadgeVariant, statusLabels } from "../binLabels";

function BinProductCard({ entry, bep, user, navigate, onStoreBin }) {
  const canStore =
    entry.status === "en_recibo" && entry.position && !user?.client;
  const isInactive = entry.is_active === false;

  return (
    <article className="w-[380px] max-w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-3.5 py-3">
        <h6 className="text-sm font-semibold uppercase leading-snug text-slate-900">
          {bep.entry_product?.product?.name || "—"}
        </h6>
        {bep.entry_product?.product?.client_sku ? (
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
            onClick={() =>
              navigate(
                `/inventory/products?search=${encodeURIComponent(bep.entry_product.product.client_sku)}`,
              )
            }
          >
            SKU: {bep.entry_product.product.client_sku}
            <ExternalLink className="h-3 w-3" />
          </button>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge variant={statusBadgeVariant[entry.status] || "default"} dot={false}>
            {statusLabels[entry.status] || entry.status}
          </Badge>
          <Badge
            variant={entry.was_qr_validated ? "success" : "secondary"}
            dot={false}
          >
            {entry.was_qr_validated ? "QR validado" : "QR pendiente"}
          </Badge>
          <Badge variant={entry.is_processed ? "info" : "warning"} dot={false}>
            {entry.is_processed ? "Procesado" : "No procesado"}
          </Badge>
          {isInactive ? (
            <Badge variant="danger" dot={false}>
              Inactivo
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="space-y-3 p-3.5">
        <article
          className={`rounded-lg border p-3 text-sm ${
            isInactive
              ? "border-red-200 bg-red-50/30"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mb-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-left text-sm font-semibold text-sky-600 hover:underline"
              title={`Ver bin: ${entry.code}`}
              onClick={() =>
                navigate(`/inventory/bins?bin_code=${encodeURIComponent(entry.code)}`)
              }
            >
              {entry.code}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
            {entry.position?.code ? (
              <div className="col-span-2">
                <dt className="text-slate-500">Posición</dt>
                <dd>
                  <button
                    type="button"
                    className="font-medium text-sky-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/storage/positions?search=${encodeURIComponent(entry.position.code)}`,
                      )
                    }
                  >
                    {entry.position.code}
                  </button>
                </dd>
              </div>
            ) : null}
            {(bep.batch || bep.entry_product?.batch) && (
              <div>
                <dt className="text-slate-500">Lote</dt>
                <dd className="font-medium text-slate-800">
                  {bep.batch || bep.entry_product?.batch}
                </dd>
              </div>
            )}
            {(bep.expiration_date || bep.entry_product?.expiration_date) && (
              <div>
                <dt className="text-slate-500">Vence</dt>
                <dd className="font-medium text-slate-800">
                  {formatDate(bep.expiration_date || bep.entry_product?.expiration_date)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Cantidad</dt>
              <dd className="font-medium text-slate-800">
                {bep.quantity} {bep.entry_product?.product?.uom || ""}
              </dd>
            </div>
            {bep.entry_product?.product?.condition ? (
              <div>
                <dt className="text-slate-500">Condición</dt>
                <dd className="mt-0.5">
                  <ConditionBadge condition={bep.entry_product.product.condition} />
                </dd>
              </div>
            ) : null}
            {entry.dispatched_date ? (
              <div className="col-span-2">
                <dt className="text-slate-500">Despachado</dt>
                <dd className="font-medium text-slate-800">
                  {formatDate(entry.dispatched_date)}
                </dd>
              </div>
            ) : null}
          </dl>

          {bep.reservations?.length > 0 ? (
            <div className="mt-2.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
              <p className="font-medium text-slate-700">
                Reservado:{" "}
                {bep.reservations.reduce((sum, res) => sum + res.total_quantity, 0)}{" "}
                {bep.entry_product?.product?.uom || ""}
              </p>
              <ul className="mt-1 space-y-0.5">
                {bep.reservations.map((res) => (
                  <li key={res.exit_id}>
                    {res.total_quantity} {bep.entry_product?.product?.uom || ""}{" "}
                    <button
                      type="button"
                      className="text-sky-600 hover:underline"
                      onClick={() =>
                        navigate(`/order/exits?exit_code=${encodeURIComponent(res.exit_code)}`)
                      }
                    >
                      {res.exit_code}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {canStore ? (
            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-2.5">
              <Button
                variant="primary"
                size="sm"
                icon={QrCode}
                onClick={() => onStoreBin(entry)}
              >
                Almacenar bin
              </Button>
            </div>
          ) : null}
        </article>
      </div>
    </article>
  );
}

export default function BinExpandedProducts({ entry, user, navigate, onStoreBin }) {
  const products = entry.bin_products || [];

  if (!products.length) {
    return (
      <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
        Este bin no tiene productos asignados
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {products.map((bep) => (
          <BinProductCard
            key={bep.id}
            entry={entry}
            bep={bep}
            user={user}
            navigate={navigate}
            onStoreBin={onStoreBin}
          />
        ))}
      </div>
    </div>
  );
}
