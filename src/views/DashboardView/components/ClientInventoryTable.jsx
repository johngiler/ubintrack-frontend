"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button, Table } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const PAGE_SIZE = 10;

function StatusBadges({ total, pending, inProgress, completed }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <Badge variant="secondary" dot={false} className="text-[10px]">
        T: {total ?? 0}
      </Badge>
      <Badge variant="warning" dot={false} className="text-[10px]">
        P: {pending ?? 0}
      </Badge>
      <Badge variant="info" dot={false} className="text-[10px]">
        EP: {inProgress ?? 0}
      </Badge>
      <Badge variant="success" dot={false} className="text-[10px]">
        C: {completed ?? 0}
      </Badge>
    </div>
  );
}

function ClientExpandedRow({ row, maxPositionsUsed }) {
  const widthPct = maxPositionsUsed
    ? Math.round((row.positions_used / maxPositionsUsed) * 100)
    : 0;

  return (
    <div className="grid gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Entradas</p>
        <StatusBadges
          total={row.entries_total}
          pending={row.entries_pending}
          inProgress={row.entries_in_progress}
          completed={row.entries_completed}
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Salidas</p>
        <StatusBadges
          total={row.exits_total}
          pending={row.exits_pending}
          inProgress={row.exits_in_progress}
          completed={row.exits_completed}
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Inventario</p>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${widthPct}%` }} />
          </div>
          <span className="text-xs font-medium tabular-nums text-slate-600">
            {row.positions_used} pos.
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Bins: {row.bins_in_warehouse ?? 0}</p>
      </div>
    </div>
  );
}

export default function ClientInventoryTable({ clientStats }) {
  const rows = clientStats?.data || [];
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});

  const maxPositionsUsed = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.positions_used || 0)) : 0),
    [rows],
  );

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const toggleExpand = (clientId) => {
    setExpanded((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  return (
    <Card>
      <Card.Header className="border-b border-slate-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
          Inventario por cliente
        </h2>
      </Card.Header>

      {rows.length ? (
        <>
          <div className="overflow-x-auto">
            <Table hover responsive className="mb-0 min-w-[760px]">
              <Table.Head>
                <tr>
                  <Table.HeaderCell className="normal-case tracking-normal">Cliente</Table.HeaderCell>
                  <Table.HeaderCell className="min-w-[220px] normal-case tracking-normal">
                    Posiciones usadas
                  </Table.HeaderCell>
                  <Table.HeaderCell className="text-center normal-case tracking-normal">
                    Bins
                  </Table.HeaderCell>
                  <Table.HeaderCell className="text-center normal-case tracking-normal">
                    Entradas
                  </Table.HeaderCell>
                  <Table.HeaderCell className="text-center normal-case tracking-normal">
                    Salidas
                  </Table.HeaderCell>
                </tr>
              </Table.Head>
              <Table.Body>
                {pageRows.map((row) => {
                  const isOpen = Boolean(expanded[row.client_id]);
                  const barWidth = maxPositionsUsed
                    ? Math.round((row.positions_used / maxPositionsUsed) * 100)
                    : 0;

                  return (
                    <Fragment key={row.client_id}>
                      <Table.Row className={isOpen ? "bg-slate-50/80" : undefined}>
                        <Table.Cell>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-left"
                            onClick={() => toggleExpand(row.client_id)}
                          >
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                            <span>
                              <span className="block text-sm font-semibold text-slate-900">
                                {row.client_name}
                              </span>
                              <span className="block text-xs text-slate-500">{row.client_slug}</span>
                            </span>
                          </button>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="min-w-[2.5rem] text-right text-xs tabular-nums text-slate-600">
                              {row.positions_used}
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-center tabular-nums text-slate-700">
                          {row.bins_in_warehouse}
                        </Table.Cell>
                        <Table.Cell>
                          <StatusBadges
                            total={row.entries_total}
                            pending={row.entries_pending}
                            inProgress={row.entries_in_progress}
                            completed={row.entries_completed}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <StatusBadges
                            total={row.exits_total}
                            pending={row.exits_pending}
                            inProgress={row.exits_in_progress}
                            completed={row.exits_completed}
                          />
                        </Table.Cell>
                      </Table.Row>
                      {isOpen ? (
                        <Table.Row>
                          <Table.Cell colSpan={5} className="!p-0">
                            <ClientExpandedRow row={row} maxPositionsUsed={maxPositionsUsed} />
                          </Table.Cell>
                        </Table.Row>
                      ) : null}
                    </Fragment>
                  );
                })}
              </Table.Body>
            </Table>
          </div>

          <Card.Footer className="flex flex-col gap-2 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Mostrando {pageRows.length} de {rows.length} clientes
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </Card.Footer>
        </>
      ) : (
        <Card.Body>
          <p className="py-8 text-center text-sm text-slate-500">No hay clientes disponibles.</p>
        </Card.Body>
      )}
    </Card>
  );
}
