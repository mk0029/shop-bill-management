import { useState } from "react";

interface ItemSelectionModal {
  isOpen: boolean;
  selectedCategory: string;
  selectedSpecifications: {
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
    let filteredItems = activeProducts.filter(
      (product) =>
        product.category?.name?.toLowerCase() ===
          itemSelectionModal.selectedCategory.toLowerCase() &&
        product.inventory.currentStock > 0 &&
        product.isActive
    );

    const { selectedSpecifications } = itemSelectionModal;

    // Apply filters
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
          product.specifications?.wattage?.toString() ===
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
    updateSpecificationFilter,
    filterItemsBySpecifications,
  };
};
