/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
 
import { Modal } from "@/components/ui/modal";
import { BrandForm } from "@/components/forms/brand-form";
import { useDataStore } from "@/store/data-store";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";

export default function BrandsPage() {
  const router = useRouter();
  const { brands: brandMap, deleteBrand, error } = useDataStore();

  // Centralized data: convert map -> array once per change
  const brands = useMemo<any[]>(() => Array.from(brandMap.values()), [brandMap]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<any | null>(null);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    // No manual refresh; realtime will update the list via centralized store
  };

  const handleEditSuccess = () => {
    setEditingBrand(null);
    // No manual refresh; realtime will update the list via centralized store
  };

  const handleDelete = async (brand: any) => {
    setDeletingBrand(brand);
  };

  const confirmDelete = async () => {
    if (deletingBrand) {
      await deleteBrand(deletingBrand._id);
      setDeletingBrand(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (isActive: boolean) => (
    <span
      className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] sm:text-xs font-normal ${
        isActive
          ? "bg-green-900/20 text-green-400 border border-green-500"
          : "bg-red-900/20 text-red-400 border border-red-500"
      }`}
    >
      {isActive ? (
        <>
          <Eye className="w-2.5 h-2.5 mr-0.5" />
          Active
        </>
      ) : (
        <>
          <EyeOff className="w-2.5 h-2.5 mr-0.5" />
          Inactive
        </>
      )}
    </span>
  );

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
              Brand Management
            </h1>
  
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
         <span className="hidden md:inline"> Add Brand</span>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-500">
          <CardContent className="sm:p-4 p-3">
            <div className="flex items-center justify-between">
              <p className="text-red-400">{error}</p>
              {/* Centralized store doesn't expose clearError; keep read-only message */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brands Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Brands ({brands.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                No brands found
              </h3>
              <p className="text-gray-400 mb-4">
                Get started by creating your first brand
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Brand
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {brands.map((brand) => (
                <Card key={brand._id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-white font-semibold leading-tight">{brand.name}</h4>
                        {brand.description && (
                          <p className="text-sm text-white mt-1 line-clamp-2">{brand.description}</p>
                        )}
                      </div>
                      {getStatusBadge(brand.isActive)}
                    </div>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="space-y-2">
                      {(brand as any).contactInfo?.email && (
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          {(brand as any).contactInfo.email}
                        </div>
                      )}
                      {(brand as any).contactInfo?.phone && (
                        <div className="flex items-center text-sm text-gray-300">
                          <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          {(brand as any).contactInfo.phone}
                        </div>
                      )}
                      {(brand as any).contactInfo?.website && (
                        <div className="flex items-center text-sm text-gray-300">
                          <Globe className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          <a
                            href={(brand as any).contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400">
                            {(brand as any).contactInfo.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      {(brand as any).contactInfo?.address && (
                        <div className="flex items-center text-sm text-gray-300">
                          <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          <span className="line-clamp-1">{(brand as any).contactInfo.address}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Created: {formatDate(brand.createdAt)}</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingBrand(brand)}
                            className="text-blue-400 hover:text-blue-300">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(brand)}
                            className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Brand Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Brand">
        <BrandForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title="Edit Brand">
        {editingBrand && (
          <BrandForm
            brand={editingBrand}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingBrand(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingBrand}
        onClose={() => setDeletingBrand(null)}
        title="Delete Brand">
        {deletingBrand && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete the brand{" "}
              <strong className="text-white">{deletingBrand.name}</strong>?
            </p>
            <p className="text-sm text-gray-400">
              This action cannot be undone. All products associated with this
              brand will need to be updated.
            </p>
            <div className="flex gap-4 pt-2 md:pt-4">
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="flex-1">
                Delete Brand
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeletingBrand(null)}
                className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Debug Panel for Realtime Testing */}
      {/* <RealtimeDebugPanel /> */}
    </div>
  );
}
