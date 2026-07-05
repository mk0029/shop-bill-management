"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Tag,
  Loader2,
  Search,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Eye,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  Percent,
  IndianRupee,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { sanityClient } from "@/lib/sanity";
import type {
  OfferWithProduct,
  CreateOfferInput,
  UpdateOfferInput,
  OfferType,
} from "@/types/offers";
import { getComputedOfferStatus } from "@/types/offers";
import { useAuthStore } from "@/store/auth-store";
import { Dropdown } from "@/components/ui/dropdown";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import { ProductSelectionModal } from "@/components/ui/product-selection-modal";

type OfferStatus = "all" | "active" | "inactive" | "expired" | "scheduled";

const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  percentage: "Percentage Discount",
  fixed_amount: "Fixed Amount Discount",
  buy_x_get_y: "Buy X Get Y",
  free_item: "Free Item",
  custom: "Custom Offer",
};

const OFFER_TYPE_ICONS: Record<
  OfferType,
  React.ComponentType<{ className?: string }>
> = {
  percentage: Percent,
  fixed_amount: IndianRupee,
  buy_x_get_y: Gift,
  free_item: Gift,
  custom: Tag,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  inactive: "text-gray-400 border-gray-500/30 bg-gray-500/10",
  expired: "text-red-400 border-red-500/30 bg-red-500/10",
  scheduled: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

export function AdminOffersClient() {
  const { role } = useAuthStore();
  const isSuperAdmin = role === "super_admin";
  const [productListOffer, setProductListOffer] =
    useState<OfferWithProduct | null>(null);

  const [offers, setOffers] = useState<OfferWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OfferStatus>("all");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editOffer, setEditOffer] = useState<OfferWithProduct | null>(null);
  const [viewOffer, setViewOffer] = useState<OfferWithProduct | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    inactive: 0,
    totalClaims: 0,
  });
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const [offersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/offers?${params}`),
        fetch("/api/admin/offers?stats=true"),
      ]);
      const offersData = await offersRes.json();
      const statsData = await statsRes.json();
      if (offersData.success) setOffers(offersData.data);
      if (statsData.success) setStats(statsData.data);
    } catch {
      showToast("error", "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    const sub = sanityClient
      .listen(
        '*[_type in ["offer", "offerClaim"]]',
        {},
        { includeResult: false, visibility: "query" },
      )
      .subscribe({
        next: () => void fetchOffers(),
        error: (error) =>
          console.warn("[admin-offers] realtime refresh failed", error),
      });

    return () => sub.unsubscribe();
  }, [fetchOffers]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (input: CreateOfferInput) => {
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Offer created successfully");
        setShowCreateModal(false);
        fetchOffers();
      } else {
        showToast("error", data.error || "Failed to create offer");
      }
    } catch {
      showToast("error", "Failed to create offer");
    }
  };

  const handleUpdate = async (id: string, input: UpdateOfferInput) => {
    try {
      const res = await fetch(`/api/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Offer updated successfully");
        setEditOffer(null);
        fetchOffers();
      } else {
        showToast("error", data.error || "Failed to update offer");
      }
    } catch {
      showToast("error", "Failed to update offer");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/offers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          "success",
          `Offer ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
        );
        fetchOffers();
      } else {
        showToast("error", data.error || "Failed to update status");
      }
    } catch {
      showToast("error", "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Offer deleted successfully");
        setShowDeleteConfirm(null);
        fetchOffers();
      } else {
        showToast("error", data.error || "Failed to delete offer");
      }
    } catch {
      showToast("error", "Failed to delete offer");
    }
  };

  const getOfferStatusInfo = (
    offer: OfferWithProduct,
  ): { label: string; colorClass: string } => {
    if (offer.status === "inactive")
      return { label: "Inactive", colorClass: STATUS_COLORS.inactive };

    const computed = getComputedOfferStatus(offer.startAt, offer.endAt);
    if (computed === "scheduled")
      return { label: "Scheduled", colorClass: STATUS_COLORS.scheduled };
    if (computed === "expired")
      return { label: "Expired", colorClass: STATUS_COLORS.expired };
    if (offer.maxClaims > 0 && offer.currentClaimCount >= offer.maxClaims)
      return { label: "Fully Claimed", colorClass: STATUS_COLORS.expired };
    return { label: "Active", colorClass: STATUS_COLORS.active };
  };

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
  }: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }) => (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 h-full">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed right-4 top-4 z-[300] rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                : "border-red-500/30 bg-red-500/15 text-red-200"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Offers Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Create and manage promotional offers
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Offer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Offers"
          value={stats.total}
          icon={Tag}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={Power}
          color="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={Clock}
          color="bg-red-500/20 text-red-400"
        />
        <StatCard
          label="Inactive"
          value={stats.inactive}
          icon={PowerOff}
          color="bg-gray-500/20 text-gray-400"
        />
        <StatCard
          label="Total Claims"
          value={stats.totalClaims}
          icon={Users}
          color="bg-amber-500/20 text-amber-400"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/30 focus:bg-white/[0.06]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              "all",
              "active",
              "expired",
              "scheduled",
              "inactive",
            ] as OfferStatus[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                statusFilter === s
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                  : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-20">
          <Tag className="mb-3 h-10 w-10 text-gray-500" />
          <p className="text-sm text-gray-400">No offers found</p>
          <Button
            variant="ghost"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 text-cyan-400"
          >
            Create your first offer
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {offers.map((offer) => {
            const statusInfo = getOfferStatusInfo(offer);
            const TypeIcon =
              OFFER_TYPE_ICONS[offer.offerType as OfferType] || Tag;

            return (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-cyan-400 shrink-0" />
                      <h3 className="truncate text-sm font-semibold text-white">
                        {offer.title}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo.colorClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    {offer.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                        {offer.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(offer.startAt)} - {formatDate(offer.endAt)}
                      </span>
                      {offer.offerType === "percentage" &&
                        offer.discountValue != null && (
                          <span>{offer.discountValue}% OFF</span>
                        )}
                      {offer.offerType === "fixed_amount" &&
                        offer.discountValue != null && (
                          <span>{formatINR(offer.discountValue)} OFF</span>
                        )}
                      <span>
                        Claims: {offer.currentClaimCount}
                        {offer.maxClaims > 0 ? ` / ${offer.maxClaims}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductListOffer(offer);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/8 px-2 py-0.5 text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/15 transition"
                      >
                        Check Details
                      </button>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleStatus(offer._id, offer.status)
                      }
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      title={
                        offer.status === "active" ? "Deactivate" : "Activate"
                      }
                    >
                      {offer.status === "active" ? (
                        <Power className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <PowerOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOffer(offer)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewOffer(offer)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(offer._id)}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-500/20 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editOffer) && (
        <OfferFormModal
          mode={editOffer ? "edit" : "create"}
          offer={editOffer}
          onClose={() => {
            setShowCreateModal(false);
            setEditOffer(null);
          }}
          onSubmit={
            editOffer
              ? (data) => handleUpdate(editOffer._id, data)
              : handleCreate
          }
        />
      )}

      {/* View Modal */}
      {viewOffer && (
        <OfferViewModal offer={viewOffer} onClose={() => setViewOffer(null)} />
      )}

      {/* Product List Modal */}
      <BaseGlassModal
        isOpen={!!productListOffer}
        onClose={() => setProductListOffer(null)}
        title="Available Items"
        size="md"
        mobileType="modal"
        backCloseId="admin-offer-products"
      >
        {productListOffer && (
          <>
            <div className="max-h-72 space-y-1 overflow-y-auto px-2 py-1">
              {(productListOffer.products || []).length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4">
                  No items listed
                </p>
              ) : (
                (productListOffer.products || []).map((p, i) => {
                  const item = p as {
                    name?: string;
                    brand?: string;
                    _id?: string;
                  };
                  return (
                    <div
                      key={item._id || i}
                      className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-bold text-cyan-300">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">
                          {item.name || "Unknown Item"}
                        </p>
                        {item.brand && (
                          <p className="text-[10px] text-gray-500">
                            {item.brand}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-3 border-t border-white/[0.06] px-2 pt-3">
              <p className="text-center text-[11px] text-gray-500">
                This offer is available on{" "}
                {(productListOffer.products || []).length} item(s)
              </p>
            </div>
          </>
        )}
      </BaseGlassModal>

      {/* Delete Confirm */}
      <BaseGlassModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Offer"
        size="md"
        mobileType="modal"
        backCloseId="admin-delete-offer"
      >
        {showDeleteConfirm && (
          <div className="px-2 py-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm text-gray-400">
                This action cannot be undone.
              </p>
            </div>
            <p className="text-sm text-gray-400">
              Are you sure you want to delete this offer?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </BaseGlassModal>
    </div>
  );
}

function OfferFormModal({
  mode,
  offer,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  offer: OfferWithProduct | null;
  onClose: () => void;
  onSubmit: (data: CreateOfferInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(offer?.title || "");
  const [description, setDescription] = useState(offer?.description || "");
  const [offerType, setOfferType] = useState<OfferType>(
    offer?.offerType || "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    offer?.discountValue?.toString() || "",
  );
  const [startAt, setStartAt] = useState(
    offer?.startAt || "",
  );
  const [endAt, setEndAt] = useState(
    offer?.endAt || "",
  );
  const [status, setStatus] = useState(offer?.status || "active");
  const [maxClaims, setMaxClaims] = useState(
    offer?.maxClaims?.toString() || "0",
  );
  const [maxClaimsPerUser, setMaxClaimsPerUser] = useState(
    offer?.maxClaimsPerUser?.toString() || "1",
  );
  const [terms, setTerms] = useState(offer?.terms || "");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    offer
      ? offer?.products
          ?.map((p) => {
            if (typeof p === "object" && p !== null) {
              const prod = (
                p as { product?: { _id?: string }; _id?: string; _ref?: string }
              ).product;
              return (
                prod?._id ||
                (p as { _id?: string })._id ||
                (p as { _ref?: string })._ref ||
                ""
              );
            }
            return "";
          })
          .filter(Boolean) || []
      : (() => {
          try {
            const initialId =
              typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).get("productId");
            return initialId ? [initialId] : [];
          } catch {
            return [];
          }
        })(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt || !endAt) {
      alert("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        offerType,
        discountValue: discountValue ? Number(discountValue) : 0,
        productIds: selectedProducts,
        productTypes: selectedProducts.map(() => "shopProduct"),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        status: status as "active" | "inactive",
        maxClaims: Number(maxClaims),
        maxClaimsPerUser: Number(maxClaimsPerUser),
        terms: terms.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const offerTypeOptions = [
    { value: "percentage", label: "Percentage Discount" },
    { value: "fixed_amount", label: "Fixed Amount Discount" },
    { value: "buy_x_get_y", label: "Buy X Get Y" },
    { value: "free_item", label: "Free Item" },
    { value: "custom", label: "Custom Offer" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <>
      <BaseGlassModal
        isOpen={true}
        onClose={onClose}
        title={mode === "create" ? "Create New Offer" : "Edit Offer"}
        size="lg"
        mobileType="modal"
        backCloseId={
          mode === "create" ? "admin-create-offer" : "admin-edit-offer"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5 px-2 py-1 sm:px-1">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Offer Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale 20% Off"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/30"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of the offer"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/30"
            />
          </div>

          {/* Offer Type & Value */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Offer Type *
              </label>
              <Dropdown
                options={offerTypeOptions}
                value={offerType}
                onValueChange={(v) => setOfferType(v as OfferType)}
                placeholder="Select offer type"
                zIndex={350}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Discount Value {offerType === "percentage" ? "(%)" : "(INR)"}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min={0}
                max={offerType === "percentage" ? 100 : undefined}
                placeholder={offerType === "percentage" ? "e.g. 20" : "e.g. 500"}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/30"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Start Date *
              </label>
              <AppDateTimePicker
                mode="datetime"
                value={startAt}
                onChange={setStartAt}
                placeholder="Select start date & time"
                disablePastDates
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                End Date *
              </label>
              <AppDateTimePicker
                mode="datetime"
                value={endAt}
                onChange={setEndAt}
                placeholder="Select end date & time"
                minDate={startAt ? new Date(startAt) : undefined}
                disablePastDates
              />
            </div>
          </div>

          {/* Status & Limits */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Status
              </label>
              <Dropdown
                options={statusOptions}
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "inactive")}
                placeholder="Select status"
                zIndex={350}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Total Claim Limit (0 = unlimited)
              </label>
              <input
                type="number"
                value={maxClaims}
                onChange={(e) => setMaxClaims(e.target.value)}
                min={0}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Per-User Claim Limit
              </label>
              <input
                type="number"
                value={maxClaimsPerUser}
                onChange={(e) => setMaxClaimsPerUser(e.target.value)}
                min={0}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/30"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Select Products *
            </label>
            <button
              type="button"
              onClick={() => setShowProductPicker(true)}
              className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white transition hover:border-cyan-400/30"
            >
              {selectedProducts.length > 0 ? (
                <span className="text-cyan-400">
                  {selectedProducts.length} Product{selectedProducts.length !== 1 ? "s" : ""} Selected
                </span>
              ) : (
                <span className="text-gray-400">Choose Products</span>
              )}
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Terms */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-300">
              Terms & Conditions
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              placeholder="Terms and conditions..."
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/30"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || selectedProducts.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : mode === "create" ? (
                "Create Offer"
              ) : (
                "Update Offer"
              )}
            </Button>
          </div>
        </form>
      </BaseGlassModal>

      <ProductSelectionModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onDone={(ids) => setSelectedProducts(ids)}
        initialSelected={selectedProducts}
      />
    </>
  );
}

function OfferViewModal({
  offer,
  onClose,
}: {
  offer: OfferWithProduct;
  onClose: () => void;
}) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  useEffect(() => {
    const fetchClaims = async () => {
      setLoadingClaims(true);
      try {
        const res = await fetch(`/api/admin/offers/${offer._id}/claims`);
        const data = await res.json();
        if (data.success) setClaims(data.data);
      } catch {}
      setLoadingClaims(false);
    };
    fetchClaims();
  }, [offer._id]);

  const now = new Date();
  const start = new Date(offer.startAt);
  const end = new Date(offer.endAt);
  const isActive = offer.status === "active" && now >= start && now <= end;

  return (
    <BaseGlassModal
      isOpen={true}
      onClose={onClose}
      title={offer.title}
      size="lg"
      mobileType="modal"
      backCloseId="admin-offer-view"
    >
      <div className="space-y-6 px-2 py-1 sm:px-1">
        {/* Status badge */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            isActive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <div
            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"}`}
          />
          {isActive
            ? "Active"
            : offer.status === "inactive"
              ? "Inactive"
              : "Expired"}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Offer Type
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {OFFER_TYPE_LABELS[offer.offerType as OfferType] ||
                offer.offerType}
            </p>
          </div>
          {offer.discountValue != null && (
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Discount Value
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {offer.offerType === "percentage"
                  ? `${offer.discountValue}%`
                  : formatINR(offer.discountValue)}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Start Date
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {formatDate(offer.startAt)}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              End Date
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {formatDate(offer.endAt)}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Claims
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {offer.currentClaimCount}
              {offer.maxClaims > 0 ? ` / ${offer.maxClaims}` : ""}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Per User Limit
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {offer.maxClaimsPerUser > 0
                ? offer.maxClaimsPerUser
                : "Unlimited"}
            </p>
          </div>
        </div>

        {/* Description */}
        {offer.description && (
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Description
            </p>
            <p className="text-sm text-gray-300">{offer.description}</p>
          </div>
        )}

        {/* Terms */}
        {offer.terms && (
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Terms & Conditions
            </p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {offer.terms}
            </p>
          </div>
        )}

        {/* Products */}
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Products
          </p>
          <div className="flex flex-wrap gap-2">
            {(offer.products || []).map((p, i) => {
              const prod = p as { name?: string; _id?: string };
              return (
                <span
                  key={i}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-gray-300"
                >
                  {prod?.name || "Unknown Product"}
                </span>
              );
            })}
          </div>
        </div>

        {/* Claims History */}
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Claim History ({claims.length})
          </p>
          {loadingClaims ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-gray-500">No claims yet</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {claims.map((claim: any) => (
                <div
                  key={claim._id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div>
                    <p className="text-xs text-white">
                      {claim.customerName || claim.customerId}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {claim.customerPhone || ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">
                      {formatDate(claim.claimedAt)}
                    </p>
                    <span
                      className={`text-[10px] font-medium ${
                        claim.status === "claimed"
                          ? "text-emerald-400"
                          : claim.status === "cancelled"
                            ? "text-red-400"
                            : "text-gray-400"
                      }`}
                    >
                      {claim.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseGlassModal>
  );
}
