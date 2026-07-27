"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, Users } from "lucide-react";
import { sanityClient } from "@/lib/sanity";

export function AdvanceSummarySection() {
  const [summary, setSummary] = useState({
    totalAdvanceBalance: 0,
    totalAdvanceCreated: 0,
    totalAdvanceUsed: 0,
    customersWithAdvance: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await sanityClient.fetch(`{
          "customers": *[_type == "user" && role == "customer" && defined(advanceBalance) && advanceBalance > 0]{
            advanceBalance,
            lifetimeAdvanceCreated,
            lifetimeAdvanceUsed
          }
        }`);
        const customers = data?.customers || [];
        const totalAdvanceBalance = customers.reduce((s: number, c: any) => s + Number(c.advanceBalance || 0), 0);
        const totalAdvanceCreated = customers.reduce((s: number, c: any) => s + Number(c.lifetimeAdvanceCreated || 0), 0);
        const totalAdvanceUsed = customers.reduce((s: number, c: any) => s + Number(c.lifetimeAdvanceUsed || 0), 0);
        setSummary({
          totalAdvanceBalance,
          totalAdvanceCreated,
          totalAdvanceUsed,
          customersWithAdvance: customers.length,
        });
      } catch {
        // silently fail
      }
    })();
  }, []);

  if (summary.totalAdvanceBalance === 0 && summary.customersWithAdvance === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="h-5 w-5 text-emerald-400" />
          Customer Advance Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-300/70 mb-1">Current Advance Balance</p>
            <p className="text-xl font-bold text-emerald-400">₹{summary.totalAdvanceBalance.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300/70 mb-1">Lifetime Advance Created</p>
            <p className="text-xl font-bold text-blue-400">₹{summary.totalAdvanceCreated.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300/70 mb-1">Lifetime Advance Used</p>
            <p className="text-xl font-bold text-amber-400">₹{summary.totalAdvanceUsed.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-300/70 mb-1">Customers with Advance</p>
            <p className="text-xl font-bold text-purple-400">{summary.customersWithAdvance}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
