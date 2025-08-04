"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
import { 
  Building2, 
  Plus, 
  Package, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  ArrowLeft,
  CheckSquare,
  Square,
  Save
} from "lucide-react";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useRouter } from "next/navigation";
import { 
  popularBrands, 
  mockInventoryItems, 
  getBrandLabel, 
  getItemDisplayName,
  getItemSpecifications,
  currency,
  itemCategories
} from "@/lib/inventory-data";

export default function BrandManagementPage() {
  const router = useRouter();
  const [brands, setBrands] = useState(popularBrands.map(brand => ({
    ...brand,
    categories: [] as string[]
  })));
  const [showAddModal, setShowAddModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newBrand, setNewBrand] = useState({ 
    name: "", 
    value: "", 
    categories: [] as string[] 
  });
  const [editingBrand, setEditingBrand] = useState<{
    value: string;
    name: string;
    categories: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState("");

  // Filter brands based on search
  const filteredBrands = brands.filter(brand =>
    brand.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get items for selected brand
  const brandItems = mockInventoryItems.filter(item => 
    item.brand === selectedBrand
  );

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const brandValue = newBrand.value.toLowerCase().replace(/\s+/g, '-');
      const newBrandData = {
        value: brandValue,
        label: newBrand.name,
        categories: newBrand.categories
      };
      
      setBrands(prev => [...prev, newBrandData]);
      setNewBrand({ name: "", value: "", categories: [] });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding brand:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBrand = (brandValue: string) => {
    setBrandToDelete(brandValue);
    setShowDeleteModal(true);
  };

  const confirmDeleteBrand = () => {
    setBrands(prev => prev.filter(brand => brand.value !== brandToDelete));
    setShowDeleteModal(false);
    setBrandToDelete("");
  };

  const handleViewItems = (brandValue: string) => {
    setSelectedBrand(brandValue);
    setShowItemsModal(true);
  };

  const handleEditBrand = (brand: { value: string; label: string; categories: string[] }) => {
    setEditingBrand({
      value: brand.value,
      name: brand.label,
      categories: brand.categories
    });
    setShowEditModal(true);
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBrands(prev => prev.map(brand => 
        brand.value === editingBrand.value 
          ? { ...brand, categories: editingBrand.categories }
          : brand
      ));
      
      setShowEditModal(false);
      setEditingBrand(null);
    } catch (error) {
      console.error("Error updating brand:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    if (!editingBrand) return;
    
    setEditingBrand(prev => {
      if (!prev) return null;
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: newCategories };
    });
  };

  const toggleNewBrandCategory = (category: string) => {
    setNewBrand(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: newCategories };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Brand Management</h1>
          <p className="text-gray-400 mt-1">
            Manage your product brands and view items by brand
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Brand
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
        />
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBrands.map((brand) => {
          const itemCount = mockInventoryItems.filter(item => item.brand === brand.value).length;
          
          return (
            <Card key={brand.value} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditBrand(brand)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewItems(brand.value)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteBrand(brand.value)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-white mb-1">{brand.label}</h3>
                <p className="text-sm text-gray-400 mb-2">
                  {itemCount} item{itemCount !== 1 ? 's' : ''} in inventory
                </p>
                {brand.categories.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {brand.categories.map(category => (
                        <span
                          key={category}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full"
                        >
                          {itemCategories.find(c => c.value === category)?.label || category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewItems(brand.value)}
                  className="w-full"
                >
                  View Items
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Brand Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        size="md"
        title="Add New Brand"
      >
        <form onSubmit={handleAddBrand} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="brandName" className="text-gray-300">
              Brand Name *
            </Label>
            <Input
              id="brandName"
              type="text"
              value={newBrand.name}
              onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              placeholder="Enter brand name (e.g., Havells, Philips)"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandValue" className="text-gray-300">
              Brand Value *
            </Label>
            <Input
              id="brandValue"
              type="text"
              value={newBrand.value}
              onChange={(e) => setNewBrand(prev => ({ ...prev, value: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              placeholder="Enter brand value (e.g., havells, philips)"
              required
            />
            <p className="text-xs text-gray-400">
              This will be used as the internal identifier
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-gray-300">Allowed Categories</Label>
            <div className="grid grid-cols-2 gap-3">
              {itemCategories.map((category) => (
                <label
                  key={category.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-700 hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={newBrand.categories.includes(category.value)}
                    onChange={() => toggleNewBrandCategory(category.value)}
                    className="sr-only"
                  />
                  {newBrand.categories.includes(category.value) ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm text-gray-300">{category.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isLoading ? "Adding..." : "Add Brand"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Items by Brand Modal */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        size="lg"
        title={`${getBrandLabel(selectedBrand)} - Inventory Items`}
      >
        <div className="space-y-6">
          {brandItems.length > 0 ? (
            <div className="space-y-4">
              {brandItems.map((item) => (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">
                          {getItemDisplayName(item)}
                        </h4>
                        <p className="text-sm text-gray-400 mb-2">
                          {getItemSpecifications(item)}
                        </p>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-400">
                            Purchase: {currency}{item.purchasePrice}
                          </span>
                          <span className="text-gray-400">
                            Selling: {currency}{item.sellingPrice}
                          </span>
                          <span className="text-gray-400">
                            Stock: {item.currentStock} {item.unit}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowItemsModal(false);
                          router.push(`/admin/inventory/edit/${item.id}`);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                No Items Found
              </h3>
              <p className="text-gray-400 mb-4">
                No items are currently available for this brand.
              </p>
              <Button
                onClick={() => {
                  setShowItemsModal(false);
                  router.push("/admin/inventory/add");
                }}
              >
                Add New Item
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowItemsModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingBrand(null);
        }}
        size="md"
        title={`Edit ${editingBrand?.name} Categories`}
      >
        <form onSubmit={handleUpdateBrand} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-300">Brand Name</Label>
            <Input
              type="text"
              value={editingBrand?.name || ""}
              disabled
              className="bg-gray-800 border-gray-700 text-gray-400"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-gray-300">Allowed Categories</Label>
            <div className="grid grid-cols-2 gap-3">
              {itemCategories.map((category) => (
                <label
                  key={category.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-700 hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={editingBrand?.categories.includes(category.value) || false}
                    onChange={() => toggleCategory(category.value)}
                    className="sr-only"
                  />
                  {editingBrand?.categories.includes(category.value) ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm text-gray-300">{category.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? "Updating..." : "Update Brand"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingBrand(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteBrand}
        title="Delete Brand"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        type="confirm"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
} 