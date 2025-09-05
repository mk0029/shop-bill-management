/**
 * Stock Validation Display Component
 * Shows stock validation results with visual indicators
 */

import React from "react";
import { StockValidationResult } from "@/lib/inventory-management";
import { AlertTriangle, CheckCircle, XCircle, Package } from "lucide-react";

interface StockValidationDisplayProps {
  validationResults: StockValidationResult[];
  isValidating: boolean;
  errors: string[];
  className?: string;
}

export function StockValidationDisplay({
  validationResults,
  isValidating,
  errors,
  className = "",
}: StockValidationDisplayProps) {
  if (isValidating) {
    return (
      <div
        className={`bg-blue-900/20 border border-blue-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-blue-400">
          <Package className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Validating stock availability...</span>
        </div>
      </div>
    );
  }

  if (validationResults.length === 0 && errors.length === 0) {
    return null;
  }

  const hasErrors =
    errors.length > 0 || validationResults.some((r) => !r.isValid);

  return (
    <div
      className={`border rounded-lg p-4 ${className} ${
        hasErrors
          ? "bg-red-900/20 border-red-800"
          : "bg-green-900/20 border-green-800"
      }`}>
      <div className="space-y-3">
        {/* Overall Status */}
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          <span
            className={`font-medium ${
              hasErrors ? "text-red-400" : "text-green-400"
            }`}>
            {hasErrors ? "Stock Validation Failed" : "Stock Validation Passed"}
          </span>
        </div>

        {/* General Errors */}
        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Individual Product Results */}
        {validationResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">
              Product Details:
            </h4>
            <div className="space-y-2">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.isValid
                      ? "bg-green-900/10 border-green-800/50"
                      : "bg-red-900/10 border-red-800/50"
                  }`}>
                  <div className="flex items-center gap-3">
                    {result.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {result.productName}
                      </p>
                      {result.error && (
                        <p className="text-xs text-red-400 mt-1">
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-300">
                      <span
                        className={
                          result.isValid ? "text-green-400" : "text-red-400"
                        }>
                        {result.availableStock}
                      </span>
                      {" / "}
                      <span className="text-gray-400">
                        {result.requestedQuantity} requested
                      </span>
                    </div>
                    {!result.isValid && (
                      <div className="text-xs text-red-400 mt-1">
                        Short by{" "}
                        {result.requestedQuantity - result.availableStock}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {validationResults.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {validationResults.filter((r) => r.isValid).length} of{" "}
                {validationResults.length} items available
              </span>
              <span className={hasErrors ? "text-red-400" : "text-green-400"}>
                {hasErrors
                  ? "Cannot proceed with bill"
                  : "Ready to create bill"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for displaying stock status in product selection
export function ProductStockStatus({
  availableStock,
  requestedQuantity,
  productName,
  unit = "pcs",
  className = "",
}: {
  availableStock: number;
  requestedQuantity: number;
  productName: string;
  unit?: string;
  className?: string;
}) {
  const isAvailable = availableStock >= requestedQuantity;
  const isLowStock = availableStock <= 5; // Configurable threshold

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isAvailable ? (
        <CheckCircle
          className={`w-4 h-4 ${
            isLowStock ? "text-yellow-400" : "text-green-400"
          }`}
        />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white truncate">{productName}</span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isAvailable
                ? isLowStock
                  ? "bg-yellow-900/20 text-yellow-400"
                  : "bg-green-900/20 text-green-400"
                : "bg-red-900/20 text-red-400"
            }`}>
            {availableStock} {unit} available
          </span>
        </div>

        {!isAvailable && (
          <div className="text-xs text-red-400 mt-1">
            Short by {requestedQuantity - availableStock} {unit}
          </div>
        )}

        {isAvailable && isLowStock && (
          <div className="text-xs text-yellow-400 mt-1">Low stock warning</div>
        )}
      </div>
    </div>
  );
}

// Component for displaying price information
export function ProductPriceDisplay({
  purchasePrice,
  sellingPrice,
  unit,
  lastUpdated,
  className = "",
}: {
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  lastUpdated: string;
  className?: string;
}) {
  const profit = sellingPrice - purchasePrice;
  const profitMargin = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Purchase Price</span>
          <span className="text-sm text-white">
            ₹{purchasePrice.toFixed(2)}/{unit}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Selling Price</span>
          <span className="text-sm text-green-400 font-medium">
            ₹{sellingPrice.toFixed(2)}/{unit}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Profit Margin</span>
          <span
            className={`text-sm font-medium ${
              profitMargin > 0
                ? "text-green-400"
                : profitMargin < 0
                ? "text-red-400"
                : "text-gray-400"
            }`}>
            {profitMargin > 0 ? "+" : ""}
            {profitMargin.toFixed(1)}%
          </span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
