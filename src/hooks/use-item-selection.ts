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
    const selected = itemSelectionModal.selectedCategory.trim().toLowerCase();

    // Helper: does product belong to selected category or any of its parent levels?
    const matchesCategoryOrParent = (product: any) => {
      const catName = product.category?.name?.trim().toLowerCase();
      const parentNameFromRel = product.category?.parentCategory?.name
        ?.trim()
        .toLowerCase();
      const parentFromSpecsRaw =
        product.specifications?.["Parent Category"] ??
        product.specifications?.parentCategory;
      const parentNameFromSpecs = parentFromSpecsRaw
        ? String(parentFromSpecsRaw).trim().toLowerCase()
        : undefined;
      return (
        catName === selected ||
        parentNameFromRel === selected ||
        parentNameFromSpecs === selected
      );
    };

    let filteredItems = activeProducts.filter(
      (product) =>
        matchesCategoryOrParent(product) &&
        product.inventory.currentStock > 0 &&
        product.isActive
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
