"use client";

import useSWRInfinite from "swr/infinite";
import useSWR from "swr";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import WmsFeedSkeleton from "@/components/wms/WmsFeedSkeleton";
import { swrInfiniteDefaults } from "@/lib/swr/infiniteDefaults";
import { swrKeys } from "@/lib/swr/keys";
import {
  fetchActivityBatch,
  fetchActivityBatchItems,
} from "@/services/activityService";

const PAGE_SIZE = 20;

export default function ActivityBatchDetailModal({
  open,
  batchId,
  onClose,
  onOpenItem,
}) {
  const enabled = Boolean(open && batchId);

  const { data: batch, isLoading: batchLoading } = useSWR(
    enabled ? swrKeys.activityBatch(batchId) : null,
    () => fetchActivityBatch(batchId),
  );

  const {
    data,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (!enabled) return null;
      if (previousPageData && !previousPageData.next) return null;
      return swrKeys.activityBatchItems(batchId, pageIndex + 1, PAGE_SIZE);
    },
    ([, , , page, pageSize]) => fetchActivityBatchItems(batchId, page, pageSize),
    swrInfiniteDefaults,
  );

  const pages = data || [];
  const items = pages.flatMap((p) => p.results || []);
  const total = pages[0]?.count ?? batch?.item_count ?? 0;
  const hasMore = Boolean(pages.length && pages[pages.length - 1]?.next);

  return (
    <Modal show={open} onHide={onClose} size="lg" centered layerClassName="z-[60]">
      <Modal.Header closeButton>
        <Modal.Title>Detalle del lote</Modal.Title>
        {batch?.summary ? (
          <Modal.Subtitle>{batch.summary}</Modal.Subtitle>
        ) : null}
      </Modal.Header>
      <Modal.Body>
        {batchLoading || isLoading ? (
          <WmsFeedSkeleton rows={4} />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--foreground-muted)]">
            Sin ítems en este lote.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)]">
            {items.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--surface-hover)]/40"
                  onClick={() => onOpenItem?.(row)}
                  disabled={!row.resource_id || !onOpenItem}
                >
                  <span className="font-medium">
                    {row.resource_code || `#${row.resource_id}`}
                  </span>
                  <span className="text-xs text-[var(--foreground-muted)]">
                    Ver historial
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <LoadMoreFooter
          hasMore={hasMore}
          loading={isValidating && !isLoading}
          onLoadMore={() => setSize(size + 1)}
          loadedCount={items.length}
          totalCount={total}
          itemLabel="ítems"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
