"use client";

import { Calendar, Filter } from "lucide-react";

import { Button, Card, Form } from "@/components/ui/bootstrap";
import { getTodayIsoDate } from "../billingUtils";

export default function BillingPeriodFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  isLoading = false,
}) {
  return (
    <Card className="mb-5">
      <Card.Body className="flex flex-wrap items-center gap-3 !py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-[var(--foreground-muted)]">
          <Calendar className="h-4 w-4 text-[var(--brand-primary)]" />
          Período
        </div>
        <Form.Control
          type="date"
          value={startDate}
          max={getTodayIsoDate()}
          className="!w-40"
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        <span className="text-sm text-slate-400 dark:text-[var(--foreground-muted)]">al</span>
        <Form.Control
          type="date"
          value={endDate}
          max={getTodayIsoDate()}
          className="!w-40"
          onChange={(e) => onEndDateChange(e.target.value)}
        />
        <Button variant="primary" size="sm" icon={Filter} onClick={onApply} disabled={isLoading}>
          Aplicar
        </Button>
      </Card.Body>
    </Card>
  );
}
