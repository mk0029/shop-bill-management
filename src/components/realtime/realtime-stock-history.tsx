"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentListener } from "@/hooks/use-realtime-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  RotateCcw,
  AlertTriangle,
  DollarSign,
  Zap,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface StockTransaction {
  _id: string;
  type: "purchase" | "sale" | "adjustment" | "return" | "damage";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  product: {
    _id: string;
    name: string;
    productId: string;
  };
  transactionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RealtimeStockHistoryProps {
  initialTransactions: StockTransaction[];
  maxItems?: number;
  onTransactionClick?: (transaction: StockTransaction) => void;
  showNewTransactionAnimation?: boolean;
}

export const RealtimeStockHistory: React.FC<RealtimeStockHistoryProps> = ({
  initialTransactions,
  maxItems,
  onTransactionClick,
  showNewTransactionAnimation = true,
}) => {
  const [transactions, setTransactions] =
    useState<StockTransaction[]>(initialTransactions);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(
    new Set()
  );

  // Consolidated stock transaction listener (handles both list and summary updates)
  useDocumentListener("stockTransaction", undefined, {
    onUpdate: (update: any) => {
      const { transition, result } = update;

      switch (transition) {
        case "appear":
          setTransactions((prev) => {
            const exists = prev.find((t) => t._id === result._id);
            if (!exists) {
              if (showNewTransactionAnimation) {
                setNewTransactionIds((prev) => new Set(prev).add(result._id));
                // Remove the highlight after 3 seconds
                setTimeout(() => {
                  setNewTransactionIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(result._id);
                    return newSet;
                  });
                }, 3000);
              }

              toast.success(
                `New ${result.type} transaction: ${result.quantity} units of ${
                  result.product?.name || "Product"
                }`,
                {
                  icon:
                    result.type === "purchase" ? (
                      <Plus className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    ),
                }
              );

              return [result, ...prev];
            }
            return prev;
          });
          break;

        case "update":
          setTransactions((prev) =>
            prev.map((transaction) =>
              transaction._id === result._id
                ? { ...transaction, ...result }
                : transaction
            )
          );
          break;

        case "disappear":
          setTransactions((prev) =>
            prev.filter((transaction) => transaction._id !== result._id)
          );
          break;
      }
    },
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return Plus;
      case "sale":
        return Minus;
      case "adjustment":
        return RotateCcw;
      case "return":
        return TrendingUp;
      case "damage":
        return AlertTriangle;
      default:
        return Package;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "purchase":
        return "text-green-400 bg-green-900";
      case "sale":
        return "text-blue-400 bg-blue-900";
      case "adjustment":
        return "text-yellow-400 bg-yellow-900";
      case "return":
        return "text-purple-400 bg-purple-900";
      case "damage":
        return "text-red-400 bg-red-900";
      default:
        return "text-gray-400 bg-gray-900";
    }
  };

  const displayTransactions = maxItems
    ? transactions.slice(0, maxItems)
    : transactions;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {displayTransactions.map((transaction) => {
          const TransactionIcon = getTransactionIcon(transaction.type);
          const isNew = newTransactionIds.has(transaction._id);

          return (
            <motion.div
              key={transaction._id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                boxShadow: isNew ? "0 0 20px rgba(34, 197, 94, 0.5)" : "none",
              }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`relative ${isNew ? "ring-2 ring-green-500" : ""}`}>
              {isNew && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-green-600 text-white flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    New
                  </Badge>
                </motion.div>
              )}

              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
                <CardContent className="sm:p-4 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTransactionColor(
                          transaction.type
                        )}`}>
                        <TransactionIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {transaction.product?.name || "Unknown Product"}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {transaction.type.charAt(0).toUpperCase() +
                            transaction.type.slice(1)}{" "}
                          •{transaction.quantity} units
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(
                            transaction.transactionDate || transaction.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          ₹{transaction.totalAmount?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-gray-400">
                          @ ₹{transaction.unitPrice?.toLocaleString() || 0}/unit
                        </p>
                        <Badge
                          className={getTransactionColor(transaction.type)}>
                          {transaction.type}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTransactionClick?.(transaction)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>

                  {transaction.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-sm text-gray-400">
                        <strong>Notes:</strong> {transaction.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {displayTransactions.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No stock transactions found</p>
            <p className="text-sm text-gray-500 mt-1">
              Transactions will appear here in real-time as they are created
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Real-time stock summary component
type StockSummary = {
  totalTransactions: number;
  totalPurchases: number;
  totalSales: number;
  totalAdjustments: number;
  totalValue: number;
  recentTransactions: number;
};

export const RealtimeStockSummary: React.FC<{ summary?: StockSummary; currency?: string }> = ({
  summary: externalSummary,
  currency,
}) => {
  const [internalSummary, setInternalSummary] = useState<StockSummary>({
    totalTransactions: 0,
    totalPurchases: 0,
    totalSales: 0,
    totalAdjustments: 0,
    totalValue: 0,
    recentTransactions: 0,
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  // Recalculate internal summary when transactions change (fallback mode)
  useEffect(() => {
    if (externalSummary) return; // when external provided, skip internal calc

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newSummary = transactions.reduce(
      (acc, transaction) => {
        acc.totalTransactions += 1;
        acc.totalValue += transaction.totalAmount || 0;

        switch (transaction.type) {
          case "purchase":
            acc.totalPurchases += 1;
            break;
          case "sale":
            acc.totalSales += 1;
            break;
          case "adjustment":
            acc.totalAdjustments += 1;
            break;
        }

        const transactionDate = new Date(
          transaction.transactionDate || transaction.createdAt
        );
        if (transactionDate >= last24Hours) {
          acc.recentTransactions += 1;
        }

        return acc;
      },
      {
        totalTransactions: 0,
        totalPurchases: 0,
        totalSales: 0,
        totalAdjustments: 0,
        totalValue: 0,
        recentTransactions: 0,
      }
    );

    setInternalSummary(newSummary);
  }, [transactions, externalSummary]);

  const summary = externalSummary || internalSummary;

  const compact = (n: number) =>
    Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(
      n || 0
    );

  const money = (n: number) => `${currency ?? "₹"}${compact(n)}`;

  const StatCard: React.FC<{
    label: string;
    value: string | number;
    Icon: React.ComponentType<{ className?: string }>;
    accent?: string; // tailwind color class for icon
  }> = ({ label, value, Icon, accent = "text-gray-300" }) => (
    <Card className="bg-gray-900/80 border-gray-800 hover:bg-gray-900 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          </div>
          <div className={`shrink-0 rounded-md bg-gray-800 p-2 ${accent.replace("text-", "")}`}>
            <Icon className={`w-5 h-5 ${accent}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Total Transactions" value={summary.totalTransactions} Icon={Package} accent="text-blue-400" />
      <StatCard label="Purchases" value={summary.totalPurchases} Icon={Plus} accent="text-green-400" />
      <StatCard label="Sales" value={summary.totalSales} Icon={Minus} accent="text-blue-400" />
      <StatCard label="Adjustments" value={summary.totalAdjustments} Icon={RotateCcw} accent="text-yellow-400" />
      <StatCard label="Total Value" value={money(summary.totalValue)} Icon={DollarSign} accent="text-purple-400" />
      <StatCard label="Last 24h" value={summary.recentTransactions} Icon={TrendingUp} accent="text-orange-400" />
    </div>
  );
}
