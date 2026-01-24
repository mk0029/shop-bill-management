"use client";

import { useEffect } from "react";
import { useDataStore } from "@/store/data-store";

export type CustomerHydrationData = {
  customer?: Record<string, any> | null;
  bills?: Array<Record<string, any>>;
};

export default function CustomerDataHydrator({
  customer,
  bills,
}: CustomerHydrationData) {
  if (typeof window !== "undefined") {
    (window as any).__SSR_DATA_HYDRATED__ = true;
  }

  useEffect(() => {
    const users = new Map<string, any>();
    if (customer?._id) users.set(customer._id, customer);

    const billsMap = new Map<string, any>();
    const billsByCustomer = new Map<string, string[]>();

    (bills || []).forEach((bill) => {
      if (!bill?._id) return;
      billsMap.set(bill._id, bill);
      const cid = bill?.customer?._id || bill?.customer?._ref;
      if (cid) {
        const list = billsByCustomer.get(String(cid)) || [];
        if (!list.includes(bill._id)) list.push(bill._id);
        billsByCustomer.set(String(cid), list);
      }
    });

    useDataStore.setState({
      users,
      bills: billsMap,
      billsByCustomer,
      lastSyncTime: new Date(),
      isLoading: false,
      error: null,
    });
  }, [customer, bills]);

  return null;
}
