"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import { formatDate } from "@/lib/format";

function BinsAccordion({ ep, expandedProducts, setExpandedProducts, navigate }) {
  const isOpen = Boolean(expandedProducts[`bins_${ep.id}`]);
  const bins = ep.related_bins || [];

  if (!bins.length) return null;

  return (
    <div className="mt-3 border-t border-[var(--border-subtle)] pt-2">
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
        onClick={() =>
          setExpandedProducts((prev) => ({
            ...prev,
            [`bins_${ep.id}`]: !prev[`bins_${ep.id}`],
          }))
        }
      >
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Ver {bins.length} bin{bins.length !== 1 ? "s" : ""}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`bins-${ep.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {bins.map((bin, index) => (
                <motion.button
                  key={bin.bin_id}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.18 }}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-left shadow-sm hover:bg-slate-50"
                  onClick={() =>
                    navigate(`/inventory/bins?bin_code=${encodeURIComponent(bin.bin_code)}`)
                  }
                >
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-600">
                    {bin.bin_code}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                  <Badge variant="primary" dot={false} className="text-xs">
                    {bin.quantity} {bin.uom || "Unidad"}
                  </Badge>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ ep, index, expandedProducts, setExpandedProducts, navigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22, ease: "easeOut" }}
      className="w-[350px] max-w-full shrink-0 rounded-lg border border-[var(--border-subtle)] bg-white p-3 text-sm shadow-sm"
    >
      <div className="mb-2">
        <h6 className="font-semibold uppercase tracking-wide text-slate-900">
          {ep.product?.name || "Producto sin nombre"}
        </h6>
        {ep.product?.client_sku ? (
          <p className="text-xs text-slate-500">SKU: {ep.product.client_sku}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-slate-600">
        <div>
          <span className="text-xs text-slate-500">En inventario</span>
          <p className="font-medium text-slate-800">{ep.in_inventory || 0}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Total</span>
          <p className="font-medium text-slate-800">{ep.real_quantity || 0}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Lote</span>
          <p className="font-medium text-slate-800">{ep.batch || "N/A"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Vence</span>
          <p className="font-medium text-slate-800">
            {ep.expiration_date ? formatDate(ep.expiration_date) : "N/A"}
          </p>
        </div>
      </div>

      <BinsAccordion
        ep={ep}
        expandedProducts={expandedProducts}
        setExpandedProducts={setExpandedProducts}
        navigate={navigate}
      />

      <div className="mt-3 border-t border-[var(--border-subtle)] pt-2">
        <p className="text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-700">Nota:</span>{" "}
          {ep.is_completed ? (
            <>
              Los productos de esta orden han sido completados{" "}
              <strong>{ep.real_quantity}</strong> de <strong>{ep.in_inventory}</strong>
            </>
          ) : ep.in_inventory > 0 ? (
            ep.in_inventory >= ep.real_quantity ? (
              "El inventario está completo."
            ) : (
              <>
                Faltan <strong>{ep.real_quantity - ep.in_inventory}</strong> unidades para
                completar el inventario.
              </>
            )
          ) : ep.related_bins?.length > 0 ? (
            <>
              Faltan <strong>{ep.real_quantity - ep.in_inventory}</strong> unidades para completar
              el inventario.
            </>
          ) : (
            "Aún no se han creado bins para este producto."
          )}
        </p>
        <div className="mt-2 flex justify-end">
          <Badge variant={ep.is_completed ? "success" : "warning"} dot={false}>
            {ep.is_completed ? "Completado" : "Pendiente"}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

const MotionTr = motion.tr;

export default function EntryExpandedProducts({ entry, expandedProducts, setExpandedProducts }) {
  const navigate = useWmsNavigate();
  const products = entry.entry_products || [];

  if (!products.length) return null;

  return (
    <MotionTr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="border-0"
    >
      <td colSpan={7} className="!border-0 !p-0">
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden bg-slate-50/80"
        >
          <div className="border-t border-[var(--border-subtle)] px-4 py-3">
            <div className="flex flex-wrap gap-3">
              {products.map((ep, index) => (
                <ProductCard
                  key={ep.id}
                  ep={ep}
                  index={index}
                  expandedProducts={expandedProducts}
                  setExpandedProducts={setExpandedProducts}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </td>
    </MotionTr>
  );
}
