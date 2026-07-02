"use client";

import { use } from "react";

import ClientBillingView from "@/views/BillingView/ClientBillingView";

export default function ClientBillingPage({ params }) {
  const { clientId } = use(params);
  return <ClientBillingView clientId={clientId} />;
}
