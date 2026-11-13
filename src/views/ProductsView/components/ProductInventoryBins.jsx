"use client";

import { Archive } from "lucide-react";
import useSWR from "swr";

import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import { getProduct } from "@/services/inventoryService";

export default function ProductInventoryBins({ product }) {
  const navigate = useWmsNavigate();
  const { data: detail, isLoading } = useSWR(
    product?.id ? ["product-inventory", product.id] : null,
    () => getProduct(product.id),
    { revalidateOnFocus: false },
  );
  const bins = detail?.inventory_bins || product.inventory_bins || [];
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useVisibleSlice(bins, 12, 12);

  if (isLoading && !detail) {
    return (
      <tr>
        <td colSpan={7} className="!bg-slate-50/80 p-0">
          <div className="border-t border-[var(--border-subtle)] px-4 py-6 text-center text-sm text-slate-500">
            Cargando bins…
          </div>
        </td>
      </tr>
    );
  }

  if (!bins.length) return null;

  return (
    <tr>
      <td colSpan={7} className="!bg-slate-50/80 p-0">
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Archive className="h-4 w-4" />
            {bins.length} bin{bins.length > 1 ? "s" : ""} almacenado
            {bins.length > 1 ? "s" : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleItems.map((bin) => (
              <div
                key={bin.bep_id || bin.id}
                className="min-w-[220px] max-w-[300px] rounded-lg border border-[var(--border-subtle)] bg-white p-3 text-sm shadow-sm"
              >
                <button
                  type="button"
                  className="font-semibold text-sky-600 hover:underline"
                  onClick={() =>
                    navigate(`/inventory/bins?bin_code=${encodeURIComponent(bin.code)}`)
                  }
                >
                  {bin.code}
                </button>
                {bin.position && (
                  <p className="mt-1 text-slate-600">
                    <span className="font-medium text-slate-700">Posición:</span>{" "}
                    <button
                      type="button"
                      className="text-sky-600 hover:underline"
                      onClick={() =>
                        navigate(
                          `/storage/positions?search=${encodeURIComponent(bin.position)}`,
                        )
                      }
                    >
                      {bin.position}
                    </button>
                  </p>
                )}
                {bin.batch && (
                  <p className="mt-1 text-slate-600">
                    <span className="font-medium text-slate-700">Lote:</span> {bin.batch}
                  </p>
                )}
                {bin.expiration_date && (
                  <p className="mt-1 text-slate-600">
                    <span className="font-medium text-slate-700">Vence:</span>{" "}
                    {bin.expiration_date}
                  </p>
                )}
                <p className="mt-1 text-slate-600">
                  <span className="font-medium text-slate-700">Cantidad:</span> {bin.quantity}{" "}
                  {product.uom}
                </p>
                {bin.reserved > 0 && (
                  <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-700">Reservado:</span>{" "}
                      {bin.reserved} {product.uom}
                    </p>
                    {bin.reservations?.map((res) => (
                      <p key={res.exit_id} className="text-xs text-slate-500">
                        - {res.quantity} {product.uom}{" "}
                        <button
                          type="button"
                          className="text-sky-600 hover:underline"
                          onClick={() =>
                            navigate(
                              `/order/exits?exit_code=${encodeURIComponent(res.exit_code)}`,
                            )
                          }
                        >
                          {res.exit_code}
                        </button>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <LoadMoreFooter
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadedCount={visibleCount}
            totalCount={totalCount}
            itemLabel="bins"
          />
        </div>
      </td>
    </tr>
  );
}
