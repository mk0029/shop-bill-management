"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SanityImage } from "@/components/ui/sanity-image";
import { Dropdown } from "@/components/ui/dropdown";
import { shopProductApiService, shopCategoryApiService } from "@/lib/sanity-api-service";
import { sanityClient } from "@/lib/sanity";
import {
  Loader2,
  ArrowLeft,
  Save,
  ImagePlus,
  X,
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";

export default function ShopProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEdit = !!productId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverExtra, setIsDragOverExtra] = useState(false);
  const [originalImages, setOriginalImages] = useState<any[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  const imageRefToUrl = (ref: string) => {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "";
    if (!projectId || !dataset || !ref.startsWith("image-")) return "";
    const parts = ref.replace(/^image-/, "").split("-");
    const format = parts.pop();
    const dimensions = parts.pop();
    const id = parts.join("-");
    if (!id || !dimensions || !format) return "";
    return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`;
  };

  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    description: "",
    categoryRef: "",
    brand: "",
    sellingPrice: "",
    buyerPrice: "",
    mrp: "",
    unit: "piece",
    stockCount: "10",
    lowStockThreshold: "5",
    inStock: true,
    isActive: true,
    isFeatured: false,
    isNewArrival: false,
    seoTitle: "",
    seoDescription: "",
    features: [""] as string[],
    specifications: [] as { label: string; value: string }[],
    tags: "",
  });

  const slugFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() || "untitled";

  const discountPercent =
    form.mrp && Number(form.sellingPrice) < Number(form.mrp)
      ? Math.round(((Number(form.mrp) - Number(form.sellingPrice)) / Number(form.mrp)) * 100)
      : 0;

  const profitPercent =
    form.buyerPrice && Number(form.sellingPrice) > Number(form.buyerPrice)
      ? Math.round(((Number(form.sellingPrice) - Number(form.buyerPrice)) / Number(form.buyerPrice)) * 100)
      : 0;

  const stockStatus =
    !form.inStock || Number(form.stockCount) === 0
      ? "Out of Stock"
      : Number(form.stockCount) <= Number(form.lowStockThreshold)
        ? "Low Stock"
        : "In Stock";

  const categoryOptions = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }));

  const unitOptions = [
    { value: "piece", label: "Piece" },
    { value: "meter", label: "Meter" },
    { value: "box", label: "Box" },
    { value: "kg", label: "Kilogram" },
    { value: "set", label: "Set" },
    { value: "roll", label: "Roll" },
    { value: "pair", label: "Pair" },
    { value: "pack", label: "Pack" },
  ];

  useEffect(() => {
    shopCategoryApiService.getAll().then((res) => {
      setCategories(res.data || []);
    });
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    shopProductApiService
      .getById(productId)
      .then((res) => {
        if (res.data) {
          const p = res.data;
          setForm({
            name: p.name || "",
            shortDescription: p.shortDescription || "",
            description: p.description || "",
            categoryRef: p.category?._id || "",
            brand: p.brand || "",
            sellingPrice: String(p.pricing?.sellingPrice || ""),
            buyerPrice: String(p.pricing?.buyerPrice || ""),
            mrp: String(p.pricing?.mrp || ""),
            unit: p.pricing?.unit || "piece",
            stockCount: String(p.stockCount ?? ""),
            lowStockThreshold: String(p.lowStockThreshold ?? "5"),
            inStock: p.inStock ?? true,
            isActive: p.isActive ?? true,
            isFeatured: p.isFeatured ?? false,
            isNewArrival: p.isNewArrival ?? false,
            seoTitle: p.seoTitle || "",
            seoDescription: p.seoDescription || "",
            features: p.features?.length ? p.features : [""],
            specifications: p.specifications?.map((s: any) => ({ label: s.label, value: s.value })) || [],
            tags: p.tags?.join(", ") || "",
          });
          if (p.images?.length > 0) {
            setOriginalImages(p.images);
            const mainRef = p.images[0]?.asset?._ref;
            if (mainRef) setImagePreview(imageRefToUrl(mainRef));
            if (p.images.length > 1) {
              const rest = p.images.slice(1).map((img: any) => {
                const ref = img?.asset?._ref;
                return ref ? imageRefToUrl(ref) : null;
              }).filter(Boolean);
              setExtraImages(rest as string[]);
            }
          }
        }
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const asset = await sanityClient.assets.upload("image", file);
      return { _ref: asset._id };
    } catch {
      toast.error("Image upload failed");
      return null;
    }
  }, []);

  const processFile = useCallback((file: File, target: "main" | "extra") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (target === "main") {
        setImagePreview(reader.result as string);
        (window as any).__shopMainImage = file;
      } else {
        setExtraImages((prev) => [...prev, reader.result as string]);
        const files = (window as any).__shopExtraImages || [];
        files.push(file);
        (window as any).__shopExtraImages = files;
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, "main");
    e.target.value = "";
  };

  const handleExtraImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, "extra");
    e.target.value = "";
  };

  const removeExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
    const files = (window as any).__shopExtraImages || [];
    files.splice(index, 1);
    (window as any).__shopExtraImages = files;
  };

  const handleDrop = useCallback((e: React.DragEvent, target: "main" | "extra") => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "main") setIsDragOver(false);
    else setIsDragOverExtra(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("Please drop image files");
      return;
    }
    if (target === "main") {
      processFile(files[0], "main");
    } else {
      files.forEach((f) => processFile(f, "extra"));
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent, target: "main" | "extra") => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "main") setIsDragOver(true);
    else setIsDragOverExtra(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, target: "main" | "extra") => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "main") setIsDragOver(false);
    else setIsDragOverExtra(false);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          if (!imagePreview) {
            processFile(file, "main");
          } else {
            processFile(file, "extra");
          }
        }
        break;
      }
    }
  }, [imagePreview, processFile]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!form.categoryRef) {
      toast.error("Please select a category");
      return;
    }
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) {
      toast.error("Please enter a valid selling price");
      return;
    }

    setSaving(true);
    try {
      const images = isEdit ? [...originalImages] : [];

      if ((window as any).__shopMainImage) {
        const result = await handleImageUpload((window as any).__shopMainImage);
        if (result) {
          const newImg = { _type: "image", asset: { _type: "reference", _ref: result._ref } };
          if (images.length > 0) images[0] = newImg;
          else images.push(newImg);
        }
        delete (window as any).__shopMainImage;
      }

      const extraFiles = (window as any).__shopExtraImages || [];
      if (extraFiles.length > 0) {
        for (const file of extraFiles) {
          const result = await handleImageUpload(file);
          if (result) {
            images.push({ _type: "image", asset: { _type: "reference", _ref: result._ref } });
          }
        }
        delete (window as any).__shopExtraImages;
      }

      const payload: any = {
        name: form.name.trim(),
        slug: { _type: "slug", current: slugFromName(form.name) },
        shortDescription: form.shortDescription.trim() || undefined,
        description: form.description.trim() || undefined,
        category: { _type: "reference", _ref: form.categoryRef },
        brand: form.brand.trim() || undefined,
        pricing: {
          sellingPrice: Number(form.sellingPrice),
          buyerPrice: form.buyerPrice ? Number(form.buyerPrice) : undefined,
          mrp: form.mrp ? Number(form.mrp) : undefined,
          unit: form.unit,
        },
        stockCount: Number(form.stockCount),
        lowStockThreshold: Number(form.lowStockThreshold),
        inStock: form.inStock,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        isNewArrival: form.isNewArrival,
        features: form.features.filter(Boolean),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
        specifications: form.specifications
          .filter((s) => s.label && s.value)
          .map((s) => ({
            _key: `${Date.now()}_${Math.random()}`,
            _type: "shopSpecification",
            label: s.label,
            value: s.value,
          })),
      };

      if (images.length > 0) payload.images = images;

      if (isEdit) {
        const res = await shopProductApiService.update(productId, payload);
        if (res.success) {
          toast.success("Product updated");
          router.push("/admin/shop/products");
        } else {
          toast.error(res.error || "Failed to update");
        }
      } else {
        const res = await shopProductApiService.create(payload);
        if (res.success) {
          toast.success("Product created");
          router.push("/admin/shop/products");
        } else {
          toast.error(res.error || "Failed to create");
        }
      }
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-gray-400">Loading product...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? "Edit Product" : "New Product"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isEdit ? "Update product details" : "Create a new shop product"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-white">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter product name"
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
                <p className="text-xs text-gray-500">Auto-generated from product name</p>
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Textarea
                  value={form.shortDescription}
                  onChange={(e) => updateField("shortDescription", e.target.value)}
                  rows={2}
                  placeholder="Brief one-liner for product cards"
                />
              </div>
              <div className="space-y-2">
                <Label>Full Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  placeholder="Detailed product description"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Pricing</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Selling Price (₹) *</Label>
                  <Input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => updateField("sellingPrice", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>MRP (₹)</Label>
                  <Input
                    type="number"
                    value={form.mrp}
                    onChange={(e) => updateField("mrp", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buyer Price (₹)</Label>
                  <Input
                    type="number"
                    value={form.buyerPrice}
                    onChange={(e) => updateField("buyerPrice", e.target.value)}
                    placeholder="Your purchase cost"
                  />
                  <p className="text-xs text-gray-500">Internal – not shown to customers</p>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Dropdown
                    options={unitOptions}
                    value={form.unit}
                    onValueChange={(v) => updateField("unit", v)}
                    placeholder="Select unit"
                  />
                </div>
                {discountPercent > 0 && (
                  <div className="flex items-end pb-2">
                    <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                      {discountPercent}% OFF
                    </Badge>
                  </div>
                )}
                {profitPercent > 0 && form.buyerPrice && (
                  <div className="flex items-end pb-2">
                    <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {profitPercent}% Profit Margin
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Inventory</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={form.stockCount}
                    onChange={(e) => updateField("stockCount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Threshold</Label>
                  <Input
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) => updateField("lowStockThreshold", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="inStock"
                  checked={form.inStock}
                  onCheckedChange={(v) => updateField("inStock", v)}
                />
                <Label htmlFor="inStock" className="!text-sm !font-normal cursor-pointer">Track Inventory</Label>
              </div>
              <div className="text-sm">
                Status:{" "}
                <Badge
                  variant={
                    stockStatus === "Out of Stock"
                      ? "destructive"
                      : stockStatus === "Low Stock"
                        ? "secondary"
                        : "default"
                  }
                >
                  {stockStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Key Features</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {form.features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="text"
                    value={f}
                    onChange={(e) => {
                      const next = [...form.features];
                      next[i] = e.target.value;
                      updateField("features", next);
                    }}
                    placeholder="e.g. 1 Year Warranty"
                  />
                  <Button variant="ghost" size="icon" onClick={() => updateField("features", form.features.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => updateField("features", [...form.features, ""])}>
                <Plus className="mr-2 h-4 w-4" /> Add Feature
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Specifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {form.specifications.map((spec, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="text"
                    value={spec.label}
                    onChange={(e) => {
                      const next = [...form.specifications];
                      next[i] = { ...next[i], label: e.target.value };
                      updateField("specifications", next);
                    }}
                    placeholder="Label (e.g. Material)"
                  />
                  <Input
                    type="text"
                    value={spec.value}
                    onChange={(e) => {
                      const next = [...form.specifications];
                      next[i] = { ...next[i], value: e.target.value };
                      updateField("specifications", next);
                    }}
                    placeholder="Value (e.g. Brass)"
                  />
                  <Button variant="ghost" size="icon" onClick={() => updateField("specifications", form.specifications.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => updateField("specifications", [...form.specifications, { label: "", value: "" }])}>
                <Plus className="mr-2 h-4 w-4" /> Add Specification
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-white">Category</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Dropdown
                options={categoryOptions}
                value={form.categoryRef}
                onValueChange={(v) => updateField("categoryRef", v)}
                placeholder="Select Category"
              />
              {form.categoryRef && (() => {
                const cat = categories.find((c) => c._id === form.categoryRef);
                return cat ? (
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                    {cat.image ? (
                      <SanityImage src={cat.image} alt={cat.name} width={32} height={32} className="h-8 w-8 rounded object-cover" fallback={<ImageIcon className="h-5 w-5 text-gray-500" />} />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-gray-500" />
                    )}
                    <span className="text-sm text-white">{cat.name}</span>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div ref={dropRef}>
                <Label className="mb-2 block">Main Product Image</Label>
                <div
                  onDrop={(e) => handleDrop(e, "main")}
                  onDragOver={(e) => handleDragOver(e, "main")}
                  onDragLeave={(e) => handleDragLeave(e, "main")}
                  className={`relative flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    isDragOver
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-cyan-500/30"
                  }`}
                  onClick={() => {
                    const input = document.getElementById("main-image-input") as HTMLInputElement;
                    input?.click();
                  }}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); delete (window as any).__shopMainImage; }}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 hover:bg-black/80"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-white/5 p-3">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400">
                          <span className="text-cyan-400 font-medium">Click to upload</span> or drag & drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP (max 5MB)</p>
                      </div>
                    </div>
                  )}
                  <input
                    id="main-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMainImageChange}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Additional Images</Label>
                <div
                  onDrop={(e) => handleDrop(e, "extra")}
                  onDragOver={(e) => handleDragOver(e, "extra")}
                  onDragLeave={(e) => handleDragLeave(e, "extra")}
                  className={`flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    isDragOverExtra
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-cyan-500/30"
                  }`}
                  onClick={() => {
                    const input = document.getElementById("extra-image-input") as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <ImagePlus className="h-6 w-6 text-gray-500 mb-1" />
                  <span className="text-xs text-gray-500">Drop images here or click to add</span>
                  <input
                    id="extra-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleExtraImageAdd}
                  />
                </div>
                {extraImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {extraImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExtraImage(i)}
                          className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clipboard className="h-3.5 w-3.5" />
                  <span>You can also <strong className="text-gray-400">Ctrl+V / Cmd+V</strong> to paste images directly from clipboard (e.g. from Figma or screenshots)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.isActive} onCheckedChange={(v) => updateField("isActive", v)} />
                <span className="text-sm text-gray-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.isFeatured} onCheckedChange={(v) => updateField("isFeatured", v)} />
                <span className="text-sm text-gray-300">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.isNewArrival} onCheckedChange={(v) => updateField("isNewArrival", v)} />
                <span className="text-sm text-gray-300">New Arrival</span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder="SEO title (max 60 chars)"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500">{form.seoTitle.length}/60</p>
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={form.seoDescription}
                  onChange={(e) => updateField("seoDescription", e.target.value)}
                  rows={2}
                  placeholder="SEO description (max 160 chars)"
                  maxLength={160}
                />
                <p className="text-xs text-gray-500">{form.seoDescription.length}/160</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-white">Tags</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={form.tags}
                  onChange={(e) => updateField("tags", e.target.value)}
                  placeholder="Comma-separated tags"
                />
                <p className="text-xs text-gray-500">Separate tags with commas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 py-4 border-t border-white/10">
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>
          <Save className="mr-2 h-4 w-4" /> {isEdit ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </div>
  );
}
