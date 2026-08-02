"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { shopCategoryApiService } from "@/lib/sanity-api-service";
import { sanityClient } from "@/lib/sanity";
import { Loader2, ArrowLeft, Save, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

export default function ShopCategoryForm({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const isEdit = !!categoryId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "",
    isActive: true,
    sortOrder: "0",
  });

  const slugFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() || "untitled";

  const iconOptions = [
    { value: "", label: "No icon" },
    { value: "zap", label: "Zap (Electrical)" },
    { value: "lightbulb", label: "Lightbulb (Lights)" },
    { value: "cable", label: "Cable (Wires)" },
    { value: "settings", label: "Settings (Switches)" },
    { value: "plug", label: "Plug (Sockets)" },
    { value: "battery", label: "Battery (Power)" },
    { value: "wrench", label: "Wrench (Tools)" },
    { value: "shield", label: "Shield (Safety)" },
    { value: "fan", label: "Fan (Fans)" },
    { value: "speaker", label: "Speaker (Accessories)" },
  ];

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    shopCategoryApiService
      .getById(categoryId)
      .then((res) => {
        if (res.data) {
          const c = res.data;
          setForm({
            name: c.name || "",
            description: c.description || "",
            icon: c.icon || "",
            isActive: c.isActive ?? true,
            sortOrder: String(c.sortOrder ?? "0"),
          });
          const ref = c.image?.asset?._ref;
          if (ref) {
            setImagePreview(
              `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${ref.replace("image-", "").replace(/-/g, ".")}`
            );
          }
        }
      })
      .catch(() => toast.error("Failed to load category"))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const asset = await sanityClient.assets.upload("image", file);
      return { _ref: asset._id };
    } catch {
      toast.error("Image upload failed");
      return null;
    }
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    (window as any).__shopCategoryImage = file;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      let imageRef = null;
      if ((window as any).__shopCategoryImage) {
        const result = await handleImageUpload((window as any).__shopCategoryImage);
        if (result) {
          imageRef = { _key: Date.now().toString(36) + Math.random().toString(36).slice(2), _type: "image", asset: { _type: "reference", _ref: result._ref } };
        }
        delete (window as any).__shopCategoryImage;
      }

      const payload: any = {
        name: form.name.trim(),
        slug: { _type: "slug", current: slugFromName(form.name) },
        description: form.description.trim() || undefined,
        icon: form.icon || undefined,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      };

      if (imageRef) payload.image = imageRef;

      if (isEdit) {
        const res = await shopCategoryApiService.update(categoryId, payload);
        if (res.success) {
          toast.success("Category updated");
          router.push("/admin/shop/categories");
        } else {
          toast.error(res.error || "Failed to update");
        }
      } else {
        const res = await shopCategoryApiService.create(payload);
        if (res.success) {
          toast.success("Category created");
          router.push("/admin/shop/categories");
        } else {
          toast.error(res.error || "Failed to create");
        }
      }
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-gray-400">Loading category...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? "Edit Category" : "New Category"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isEdit ? "Update category details" : "Create a new shop category"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-white">Basic</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter category name"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  type="text"
                  value={slugFromName(form.name)}
                  readOnly
                  className="!text-gray-400"
                />
                <p className="text-xs text-gray-500">Auto-generated from name</p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description shown on category cards"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Category Image</Label>
                <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-cyan-500/30 transition-colors">
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setImagePreview(null); }}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImagePlus className="h-8 w-8 text-gray-500 mb-1" />
                      <span className="text-xs text-gray-500">Upload category image</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-white">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="catActive"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
                <Label htmlFor="catActive" className="!text-sm !font-normal cursor-pointer">Active</Label>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Dropdown
                  options={iconOptions}
                  value={form.icon}
                  onValueChange={(v) => setForm((p) => ({ ...p, icon: v }))}
                  placeholder="No icon"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 py-4 border-t border-white/10">
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" /> {isEdit ? "Update Category" : "Create Category"}
        </Button>
      </div>
    </div>
  );
}
