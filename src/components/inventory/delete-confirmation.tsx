/**
 * Delete Confirmation Component for Inventory Items
 * Handles both individual and consolidated item deletion
 */

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, Trash2, X, RefreshCw } from "lucide-react";
import { Product } from "@/store/inventory-store";
import { enhancedInventoryApi } from "@/lib/inventory-api-enhanced";

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: Product | null;
  isConsolidated: boolean;
  isDeleting: boolean;
  error?: string | null;
}

interface ProductReferences {
  canDelete: boolean;
  references: {
    activeTransactions: number;
    pendingBills: number;
    completedTransactions: number;
    allBills: number;
  };
  blockingReasons: string[];
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  product,
  isConsolidated,
  isDeleting,
  error,
}: DeleteConfirmationProps) {
  const [references, setReferences] = useState<ProductReferences | null>(null);
  const [isCheckingReferences, setIsCheckingReferences] = useState(false);
  const [showForceDelete, setShowForceDelete] = useState(false);

  const checkReferences = async () => {
    if (!product) return;

    setIsCheckingReferences(true);
    try {
      const response = await enhancedInventoryApi.checkProductReferences(
        product._id
      );
      if (response.success && response.data) {
        setReferences(response.data);
      }
    } catch (error) {
      console.error("Failed to check references:", error);
    } finally {
      setIsCheckingReferences(false);
    }
  };

  // Check references when modal opens
  useEffect(() => {
    if (isOpen && product) {
      checkReferences();
    }
  }, [isOpen, product]);

  if (!product) return null;

  const consolidatedInfo = product._consolidated;
  const hasStock = product.inventory.currentStock > 0;
  const canDelete = references?.canDelete ?? true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Delete {isConsolidated ? "Consolidated" : ""} Product
            </h3>
            <p className="text-gray-400 text-sm">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Product Information */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-400 mt-1" />
            <div className="flex-1">
              <h4 className="font-medium text-white">{product.name}</h4>
              <p className="text-sm text-gray-400 mt-1">
                Brand: {product.brand.name} • Category: {product.category.name}
              </p>

              {/* Stock Information */}
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Current Stock:</span>
                  <span
                    className={`ml-2 font-medium ${
                      hasStock ? "text-yellow-400" : "text-green-400"
                    }`}>
                    {product.inventory.currentStock}{" "}
                    {(product.pricing as any).unit || "units"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Value:</span>
                  <span className="ml-2 font-medium text-white">
                    ₹
                    {(
                      product.inventory.currentStock *
                      product.pricing.purchasePrice
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Consolidated Information */}
              {isConsolidated && consolidatedInfo && (
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">
                      Consolidated Item Details
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>
                      • Contains {consolidatedInfo.totalEntries} separate
                      entries
                    </p>
                    <p>
                      • Latest price update:{" "}
                      {new Date(
                        consolidatedInfo.latestPriceUpdate
                      ).toLocaleDateString()}
                    </p>
                    <p>• All entries will be deleted permanently</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reference Check */}
        {isCheckingReferences && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-400">
                Checking product references...
              </span>
            </div>
          </div>
        )}

        {/* Reference Information */}
        {references && !canDelete && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h5 className="font-medium text-red-400">Cannot Delete</h5>
                <p className="text-sm text-red-300 mt-1">
                  This product cannot be deleted because it has:
                </p>
                <ul className="text-sm text-red-300 mt-2 space-y-1">
                  {references.blockingReasons.map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-400 mt-2">
                  Please complete or cancel these items before deleting the
                  product.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        <div className="space-y-3">
          {hasStock && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-400">Stock Warning</h5>
                  <p className="text-sm text-yellow-300 mt-1">
                    This product has {product.inventory.currentStock}{" "}
                    {(product.pricing as any).unit || "units"} in stock.
                    Deleting will remove all stock from inventory.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h5 className="font-medium text-red-400">Soft Deletion</h5>
                <div className="text-sm text-red-300 mt-1 space-y-1">
                  <p>
                    • Product will be marked as deleted and hidden from
                    inventory
                  </p>
                  <p>
                    • All stock will be cleared and recorded in transaction
                    history
                  </p>
                  {isConsolidated && consolidatedInfo && (
                    <p>
                      • All {consolidatedInfo.totalEntries} consolidated entries
                      will be marked as deleted
                    </p>
                  )}
                  <p>• Product can be restored later if needed</p>
                  <p className="text-yellow-300">
                    • This is a safe operation that avoids data conflicts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h5 className="font-medium text-red-400">Deletion Failed</h5>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1">
            Cancel
          </Button>

          {references && !canDelete ? (
            <Button
              variant="outline"
              onClick={() => checkReferences()}
              disabled={isCheckingReferences}
              className="flex-1">
              {isCheckingReferences ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recheck References
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting || !canDelete || isCheckingReferences}
              className="flex-1">
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Mark as Deleted {isConsolidated ? "(All Entries)" : ""}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Confirmation Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Type "DELETE" to confirm this action (case sensitive)
          </p>
        </div>
      </div>
    </Modal>
  );
}

// Simplified version for quick confirmations
export function QuickDeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isConsolidated,
  consolidatedCount,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  isConsolidated: boolean;
  consolidatedCount?: number;
  isDeleting: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Confirm Deletion">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className=" h-6 w-6 sm:w-8 sm:h-8  text-red-400" />
          <div>
            <h4 className="font-medium text-white">Delete Product?</h4>
            <p className="text-sm text-gray-400 mt-1">{productName}</p>
          </div>
        </div>

        {isConsolidated && consolidatedCount && (
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              This will delete all {consolidatedCount} consolidated entries for
              this product.
            </p>
          </div>
        )}

        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
          <p className="text-sm text-red-400">
            This action cannot be undone. The product will be permanently
            removed from inventory.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
