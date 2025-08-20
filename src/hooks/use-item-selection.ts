import { useState } from "react";

interface ItemSelectionModal {
  isOpen: boolean;
  selectedCategory: string;
  selectedSpecifications: {
    subcategory?: string;
    brand?: string;
    color?: string;
    watts?: string;
    size?: string;
    wireGauge?: string;
    ampere?: string;
  };
}

export const useItemSelection = () => {
  const [itemSelectionModal, setItemSelectionModal] =
    useState<ItemSelectionModal>({
      isOpen: false,
      selectedCategory: "",
      selectedSpecifications: {},
    });

  const openItemSelectionModal = (category: string) => {
    setItemSelectionModal({
      isOpen: true,
      selectedCategory: category,
      selectedSpecifications: {},
    });
  };

  const closeItemSelectionModal = () => {
    setItemSelectionModal({
      isOpen: false,
      selectedCategory: "",
      selectedSpecifications: {},
    });
  };

  const setSelectedCategory = (categoryName: string) => {
    setItemSelectionModal((prev) => ({
      ...prev,
      selectedCategory: categoryName,
      selectedSpecifications: {}, // reset filters when category changes
    }));
  };

  const updateSpecificationFilter = (key: string, value: string) => {
    setItemSelectionModal((prev) => ({
      ...prev,
      selectedSpecifications: {
        ...prev.selectedSpecifications,
        [key]: value,
      },
    }));
  };

  const filterItemsBySpecifications = (activeProducts: any[]) => {
    const normalize = (s?: string) => {
      const t = (s || "").trim().toLowerCase();
      // basic plural trim: remove trailing 's' if present
      return t.endsWith("s") ? t.slice(0, -1) : t;
    };
    const selectedRaw = itemSelectionModal.selectedCategory;
    const selected = normalize(selectedRaw);

    // Helper: does product belong to selected category or any of its parent levels?
    const matchesCategoryOrParent = (product: any) => {
      const catName = normalize(product.category?.name);
      const catSlug = normalize(product.category?.slug?.current);
      const parentNameFromRel = product.category?.parentCategory?.name
        ? normalize(product.category?.parentCategory?.name)
        : undefined;
      const parentFromSpecsRaw =
        product.specifications?.["Parent Category"] ??
        product.specifications?.parentCategory;
      const parentNameFromSpecs = parentFromSpecsRaw
        ? normalize(String(parentFromSpecsRaw))
        : undefined;

      // Primary exact matches
      if (
        catName === selected ||
        parentNameFromRel === selected ||
        parentNameFromSpecs === selected ||
        catSlug === selected
      )
        return true;

      // Relaxed fallback: substring match and tags/specs include
      const selectedTerm = selected.trim();
      if (!selectedTerm) return false;

      const tags: string[] = Array.isArray(product.tags) ? product.tags : [];
      const specsText = Object.values(product.specifications || {})
        .map((v) => String(v).toLowerCase())
        .join(" ");

      return (
        (catName && catName.includes(selectedTerm)) ||
        (catSlug && catSlug.includes(selectedTerm)) ||
        tags.some((t) => String(t).toLowerCase().includes(selectedTerm)) ||
        specsText.includes(selectedTerm)
      );
    };

    // Do NOT filter by stock here. We want to show items even if stock is 0,
    // and handle the Add button disabling in the UI. This prevents the list
    // from appearing empty due to async inventory updates.
    let filteredItems = activeProducts.filter(
      (product) => matchesCategoryOrParent(product) && product.isActive
    );

    const { selectedSpecifications } = itemSelectionModal;

    // Apply filters
    if (selectedSpecifications.subcategory) {
      const sub = selectedSpecifications.subcategory;
      filteredItems = filteredItems.filter(
        (product) => product.category?.name === sub
      );
    }

    if (selectedSpecifications.brand) {
      filteredItems = filteredItems.filter(
        (product) => product.brand?.name === selectedSpecifications.brand
      );
    }

    if (selectedSpecifications.color) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.color === selectedSpecifications.color
      );
    }

    if (selectedSpecifications.watts) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.watts?.toString() ===
          selectedSpecifications.watts
      );
    }

    if (selectedSpecifications.size) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.size === selectedSpecifications.size
      );
    }

    if (selectedSpecifications.wireGauge) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.wireGauge === selectedSpecifications.wireGauge
      );
    }

    if (selectedSpecifications.ampere) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.amperage === selectedSpecifications.ampere
      );
    }

    return filteredItems;
  };

  return {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    setSelectedCategory,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  };
};
