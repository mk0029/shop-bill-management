"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
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
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isActive
          ? "bg-green-900/20 text-green-400 border border-green-500"
          : "bg-red-900/20 text-red-400 border border-red-500"
      }`}
    >
      {isActive ? (
        <>
          <Eye className="w-3 h-3 mr-1" />
          Active
        </>
      ) : (
        <>
          <EyeOff className="w-3 h-3 mr-1" />
          Inactive
        </>
      )}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Brand Management
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your product brands and their information
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Brand
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
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Brand
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr
                      key={brand._id}
                      className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-4 px-4">
                        <div>
                          <h4 className="font-medium text-white">
                            {brand.name}
                          </h4>
                          {brand.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                              {brand.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {(brand as any).contactInfo?.email && (
                            <div className="flex items-center text-sm text-gray-400">
                              <Mail className="w-3 h-3 mr-2" />
                              {(brand as any).contactInfo.email}
                            </div>
                          )}
                          {(brand as any).contactInfo?.phone && (
                            <div className="flex items-center text-sm text-gray-400">
                              <Phone className="w-3 h-3 mr-2" />
                              {(brand as any).contactInfo.phone}
                            </div>
                          )}
                          {(brand as any).contactInfo?.website && (
                            <div className="flex items-center text-sm text-gray-400">
                              <Globe className="w-3 h-3 mr-2" />
                              <a
                                href={(brand as any).contactInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-400">
                                {(brand as any).contactInfo.website.replace(
                                  /^https?:\/\//,
                                  ""
                                )}
                              </a>
                            </div>
                          )}
                          {(brand as any).contactInfo?.address && (
                            <div className="flex items-center text-sm text-gray-400">
                              <MapPin className="w-3 h-3 mr-2" />
                              <span className="line-clamp-1">
                                {(brand as any).contactInfo.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(brand.isActive)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {formatDate(brand.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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
              <strong className="text-white">"{deletingBrand.name}"</strong>?
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
