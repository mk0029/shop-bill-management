/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
  Calendar,
  Search,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
};

export default function BrandsPage() {
  const router = useRouter();
  const { brands: brandMap, deleteBrand, error } = useDataStore();

  const brands = useMemo<any[]>(() => Array.from(brandMap.values()), [brandMap]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const q = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.contactInfo?.email?.toLowerCase().includes(q) ||
        b.contactInfo?.phone?.toLowerCase().includes(q),
    );
  }, [brands, searchQuery]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    setEditingBrand(null);
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
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
              Brand Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {brands.length} brand{brands.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Add Brand</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brands..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.055] pl-10 pr-4 py-2.5 text-sm text-slate-100 shadow-inner shadow-white/[0.03] outline-none backdrop-blur-xl placeholder:text-slate-400/80 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/20 transition-all"
        />
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/50 backdrop-blur-sm">
          <CardContent className="sm:p-4 p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Brands Grid */}
      {filteredBrands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center backdrop-blur-xl">
              <Building2 className="w-10 h-10 text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Plus className="w-3 h-3 text-blue-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? "No matching brands" : "No brands yet"}
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm text-center">
            {searchQuery
              ? "Try a different search term or clear the filter"
              : "Create your first brand to start organizing your inventory"}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25"
            >
              <Plus className="w-4 h-4" />
              Add Brand
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          {filteredBrands.map((brand) => (
            <motion.div key={brand._id} variants={cardVariants} layout>
              <div className="group relative rounded-lg border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl shadow-sm shadow-black/20 transition-all duration-200 hover:border-white/[0.12] hover:bg-gray-900/80">
                <div className="p-3 space-y-2">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-medium text-sm leading-tight truncate">
                      {brand.name}
                    </h3>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        brand.isActive
                          ? "bg-emerald-900/30 text-emerald-300 border-emerald-500/30"
                          : "bg-red-900/30 text-red-300 border-red-500/30"
                      }`}
                    >
                      {brand.isActive ? (
                        <Eye className="w-2.5 h-2.5" />
                      ) : (
                        <EyeOff className="w-2.5 h-2.5" />
                      )}
                      {brand.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {brand.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
                      {brand.description}
                    </p>
                  )}

                  {/* Contact info */}
                  <div className="space-y-1">
                    {(brand as any).contactInfo?.email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Mail className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate">{(brand as any).contactInfo.email}</span>
                      </div>
                    )}
                    {(brand as any).contactInfo?.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Phone className="w-3 h-3 text-gray-500 shrink-0" />
                        <span>{(brand as any).contactInfo.phone}</span>
                      </div>
                    )}
                    {(brand as any).contactInfo?.website && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Globe className="w-3 h-3 text-gray-500 shrink-0" />
                        <a
                          href={(brand as any).contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-blue-400 transition-colors"
                        >
                          {(brand as any).contactInfo.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                    {(brand as any).contactInfo?.address && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate">{(brand as any).contactInfo.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Date + actions */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(brand.createdAt)}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingBrand(brand)}
                        className="p-1 rounded text-gray-500 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                        title="Edit brand"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(brand)}
                        className="p-1 rounded text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title="Delete brand"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Brand Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Brand"
      >
        <BrandForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title="Edit Brand"
      >
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
        title="Delete Brand"
      >
        {deletingBrand && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-gray-200 text-sm">
                  Are you sure you want to delete{" "}
                  <strong className="text-white">{deletingBrand.name}</strong>?
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This action cannot be undone. Products linked to this brand
                  will need to be reassigned.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="flex-1"
              >
                Delete Brand
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeletingBrand(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
