"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SanityImage } from "@/components/ui/sanity-image";
import { shopCategoryApiService } from "@/lib/sanity-api-service";
import {
  FolderTree,
  Plus,
  ImageIcon,
  Edit,
  Trash2,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/store/confirm-store";

export default function ShopCategoriesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await shopCategoryApiService.getAll();
      setCategories(res.data || []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmDialog({
      title: "Delete Category",
      description: `Delete category "${name}"? Products in this category will become uncategorized.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await shopCategoryApiService.delete(id);
      if (res.success) {
        toast.success("Category deleted");
        loadData();
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-gray-400">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-sm text-gray-400 mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={() => router.push("/admin/shop/categories/new")}>
          <Plus className="mr-2 h-4 w-4" /> Create New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderTree className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No categories yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first category to organize products</p>
            <Button onClick={() => router.push("/admin/shop/categories/new")}>
              <Plus className="mr-2 h-4 w-4" /> Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat: any) => (
            <Card key={cat._id} className="hover:border-cyan-500/30 transition-all group">
              <CardContent className="p-0">
                <div className="relative h-40 bg-white/5 overflow-hidden rounded-t-lg">
                  {cat.image ? (
                    <SanityImage
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      fallback={
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-10 w-10 text-gray-500" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-10 w-10 text-gray-500" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={cat.isActive ? "default" : "secondary"}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-base">{cat.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {cat.slug?.current || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Package className="h-4 w-4" />
                    <span>{cat.productCount ?? 0} products</span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/shop/categories/${cat._id}`)}
                    >
                      <Edit className="mr-2 h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cat._id, cat.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
