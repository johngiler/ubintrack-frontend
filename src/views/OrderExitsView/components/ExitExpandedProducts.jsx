"use client";

import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Play,
  QrCode,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";
import { formatDate } from "@/lib/format";
import { getExit } from "@/services/orderService";


const BIN_STATUS_VARIANT = {
  Almacenado: "success",
  "En despacho": "primary",
  Despachado: "secondary",
};

function ExitBinCard({
  product,
  groupId,
  exit,
  isAdmin,
  isClientUser,
  navigate,
  onProcessBin,
  onReassign,
  onReplaceBin,
  onReverse,
  processingBinId,
}) {
  const canProcess =
    !product.is_processed &&
    !isClientUser &&
    ["pendiente", "en_progreso"].includes(exit.status);

  const canReplace =
    !product.is_processed &&
    ["pendiente", "en_progreso"].includes(exit.status);

  const canReverse =
    product.is_processed && isAdmin && exit.status === "en_progreso";

  const hasConflict = product.has_stock_conflict && !product.is_processed;

  return (
    <article
      className={`rounded-lg border p-3 text-sm ${
        product.is_processed
          ? "border-slate-200 bg-slate-50/70 dark:border-slate-700/60 dark:bg-slate-800/40"
          : hasConflict
            ? "border-amber-300/80 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-500/10"
            : "border-slate-200 bg-white dark:border-slate-700/60 dark:bg-[var(--surface)]"
      }`}
    >
      {hasConflict && (
        <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Sin stock en este bin</p>
            <p className="mt-0.5 leading-relaxed">
              Necesita <strong>{product.quantity}</strong> pero este bin solo tiene{" "}
              <strong>{product.available_quantity ?? 0}</strong> disponible(s).
            </p>
            {product.alternative_bin && (
              <div className="mt-2 border-t border-amber-200/80 pt-2 dark:border-amber-500/25">
                <p className="flex items-center gap-1 font-medium">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Se reasignará a: {product.alternative_bin.bin_code}
                  {product.alternative_bin.position ? (
                    <span className="font-normal text-amber-800/80 dark:text-amber-300/80">
                      {" "}
                      (Pos: {product.alternative_bin.position})
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-amber-800/80 dark:text-amber-300/80">
                  Disponible: {product.alternative_bin.quantity} {product.product_uom}
                  {product.alternative_bin.same_batch ? (
                    <Badge variant="success" dot={false} className="ms-1.5 !py-0 text-[10px]">
                      Mismo lote
                    </Badge>
                  ) : null}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  className="mt-2 w-full border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/15"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReassign(product.id);
                  }}
                >
                  Reasignar ahora
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-left text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
          title={`Ver bin: ${product.bin_code}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/inventory/bins?bin_code=${encodeURIComponent(product.bin_code)}`);
          }}
        >
          {product.bin_code}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </button>
        {hasConflict ? (
          <Badge variant="warning" dot={false} className="text-[10px] uppercase">
            Conflicto
          </Badge>
        ) : null}
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <Badge variant={BIN_STATUS_VARIANT[product.status] || "warning"} dot={false} className="text-[10px]">
          {product.status}
        </Badge>
        {product.is_picking ? (
          <Badge variant="info" dot={false} className="text-[10px]">
            Picking
          </Badge>
        ) : null}
        <Badge
          variant={product.was_qr_validated ? "success" : "secondary"}
          dot={false}
          className="text-[10px]"
        >
          {product.was_qr_validated ? "QR validado" : "QR pendiente"}
        </Badge>
        <Badge
          variant={product.is_processed ? "info" : "warning"}
          dot={false}
          className="text-[10px]"
        >
          {product.is_processed ? "Procesado" : "No procesado"}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{product.is_processed ? "Procesado" : "Reservado"}</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {product.quantity} {product.product_uom}
          </dd>
        </div>
        {!product.is_processed ? (
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Disponible en bin</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">
              {product.available_quantity ?? 0} {product.product_uom}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Posición</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{product.position || "—"}</dd>
        </div>
        {product.batch ? (
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Lote</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{product.batch}</dd>
          </div>
        ) : null}
        {product.expiration_date ? (
          <div className="col-span-2">
            <dt className="text-slate-500 dark:text-slate-400">Vence</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{formatDate(product.expiration_date)}</dd>
          </div>
        ) : null}
      </dl>

      {(canProcess || canReplace || canReverse) && (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-700/60">
          {canReplace ? (
            <Button
              variant="outline"
              size="sm"
              icon={ScanLine}
              onClick={(e) => {
                e.stopPropagation();
                onReplaceBin(product);
              }}
            >
              Reemplazar bin
            </Button>
          ) : null}
          {canProcess ? (
            <Button
              variant="primary"
              size="sm"
              icon={QrCode}
              onClick={(e) => {
                e.stopPropagation();
                onProcessBin(product, groupId);
              }}
              disabled={processingBinId !== null && processingBinId !== product.id}
              loading={processingBinId === product.id}
            >
              Procesar bin
            </Button>
          ) : null}
          {canReverse ? (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/15"
              onClick={(e) => {
                e.stopPropagation();
                onReverse(product.id, exit.id);
              }}
            >
              Revertir
            </Button>
          ) : null}
        </div>
      )}
    </article>
  );
}

function ProductGroupCard({
  exit,
  group,
  isAdmin,
  isClientUser,
  navigate,
  onProcessAllBins,
  onProcessBin,
  onReassign,
  onReplaceBin,
  onReverse,
  processingGroupId,
  processingBinId,
}) {
  const hasConflicts = group.exit_products?.some(
    (b) => b.has_stock_conflict && !b.is_processed,
  );
  const showInventoryAlert =
    exit.status !== "completada" &&
    group.exit_products?.some((b) => !b.is_processed) &&
    group.exit_products[0]?.reserved_in_pending_orders !== undefined;

  const exitProducts = group.exit_products || [];
  const {
    visibleItems: visibleBins,
    visibleCount: visibleBinsCount,
    totalCount: totalBinsCount,
    hasMore: hasMoreBins,
    loadMore: loadMoreBins,
  } = useVisibleSlice(exitProducts, 12, 12);

  const unprocessedCount =
    exitProducts.filter((b) => !b.is_processed).length ?? 0;

  return (
    <article className="w-[380px] max-w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-[var(--surface)]">

      <header className="border-b border-slate-100 px-3.5 py-3 dark:border-slate-700/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h6 className="text-sm font-semibold uppercase leading-snug text-slate-900 dark:text-slate-100">
              {group.product_name}
            </h6>
            {group.product_sku ? (
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400"
                onClick={() =>
                  navigate(`/inventory/products?search=${encodeURIComponent(group.product_sku)}`)
                }
              >
                SKU: {group.product_sku}
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          {isAdmin &&
          ["pendiente", "en_progreso"].includes(exit.status) &&
          unprocessedCount > 1 ? (
            processingGroupId === group.id ? (
              <span
                className="spinner-border spinner-border-sm text-emerald-600"
                role="status"
                aria-label="Procesando bins"
              />
            ) : (
              <IconButton
                size="sm"
                className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                disabled={processingGroupId !== null}
                title="Procesar todos los bins"
                onClick={() => onProcessAllBins(group.id)}
              >
                <Play className="h-4 w-4" />
              </IconButton>
            )
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge variant="primary" dot={false}>
            {group.quantity} {group.product_uom}
          </Badge>
          <Badge variant="info" dot={false}>
            {group.exit_products?.length || 0} bins
          </Badge>
          {hasConflicts ? (
            <Badge variant="warning" dot={false}>
              Conflictos
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="space-y-2.5 p-3.5">
        {showInventoryAlert ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
            <p className="font-semibold">Estado de inventario</p>
            <p className="mt-1">
              Reservado (no procesado):{" "}
              <strong>
                {group.exit_products[0].reserved_in_pending_orders}{" "}
                {group.exit_products[0].product_uom}
              </strong>
            </p>
            <p>
              Total disponible:{" "}
              <strong>
                {group.exit_products[0].total_inventory_available}{" "}
                {group.exit_products[0].product_uom}
              </strong>
            </p>
          </div>
        ) : null}

        {exitProducts.length > 0 ? (
          <div className="space-y-2.5">
            {visibleBins.map((product) => (
              <ExitBinCard
                key={product.id}
                product={product}
                groupId={group.id}
                exit={exit}
                isAdmin={isAdmin}
                isClientUser={isClientUser}
                navigate={navigate}
                onProcessBin={onProcessBin}
                onReassign={onReassign}
                onReplaceBin={onReplaceBin}
                onReverse={onReverse}
                processingBinId={processingBinId}
              />
            ))}
            <LoadMoreFooter
              hasMore={hasMoreBins}
              onLoadMore={loadMoreBins}
              loadedCount={visibleBinsCount}
              totalCount={totalBinsCount}
              itemLabel="bins"
            />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">Sin bins asignados</p>
        )}
      </div>
    </article>
  );
}

export default function ExitExpandedProducts({
  exit,
  isAdmin,
  isClientUser,
  navigate,
  onProcessAllBins,
  onProcessBin,
  onReassign,
  onReplaceBin,
  onReverse,
  processingGroupId,
  processingBinId,
}) {
  // Listado trae grupos livianos; al expandir pedimos detail con conflictos/alternativas.
  const { data: detail, isLoading } = useSWR(
    exit?.id ? ["exit-expanded", exit.id] : null,
    () => getExit(exit.id),
    { revalidateOnFocus: false },
  );
  const richExit = detail
    ? { ...exit, ...detail, exit_product_groups: detail.exit_product_groups }
    : exit;
  const groups = richExit.exit_product_groups || [];
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useVisibleSlice(groups, 12, 12);

  if (isLoading && !detail) {
    return (
      <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/30 dark:text-slate-400">
        Cargando productos…
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/30 dark:text-slate-400">
        Este pedido no tiene productos asignados
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/30">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {visibleItems.map((group) => (
          <ProductGroupCard
            key={group.id}
            exit={richExit}
            group={group}
            isAdmin={isAdmin}
            isClientUser={isClientUser}
            navigate={navigate}
            onProcessAllBins={onProcessAllBins}
            onProcessBin={onProcessBin}
            onReassign={onReassign}
            onReplaceBin={onReplaceBin}
            onReverse={onReverse}
            processingGroupId={processingGroupId}
            processingBinId={processingBinId}
          />
        ))}
      </div>
      <LoadMoreFooter
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadedCount={visibleCount}
        totalCount={totalCount}
        itemLabel="productos"
      />
    </div>
  );
}
