# Add Inventory Page (`/admin/inventory/add`)

This document outlines the structure and functionality of the "Add New Product" page. This page allows administrators to add new products to the inventory system.

## Page Structure

The main page component is `AddInventoryItemPage` located at `src/app/admin/inventory/add/page.tsx`. The page consists of a single form that is divided into logical sections.

## Components Used

The page is built from the following components:

-   **`BasicInfoSection` (`@/components/inventory/basic-info-section.tsx`)**:
    -   Handles the core product details.
    -   Includes fields for selecting a `Category` and `Brand` from dropdown lists.
    -   Contains fields for `Description` and initial `Current Stock`.

-   **`PricingSection` (`@/components/inventory/pricing-section.tsx`)**:
    -   Manages the financial details of the product.
    -   Includes fields for `Purchase Price` and `Selling Price`.

-   **`DynamicSpecificationFields` (`@/components/forms/dynamic-specification-fields.tsx`)**:
    -   A key feature of the form, this component dynamically renders input fields based on the selected category.
    -   When a user selects a category in the `BasicInfoSection`, this component displays the relevant specification fields for that category (e.g., `Bore Size` for a motor, `HP` for a pump).
    -   This ensures that only relevant data is collected for each product type.

-   **`SuccessPopup` and `ConfirmationPopup` (`@/components/ui/`)**:
    -   These are used to provide feedback to the user.
    -   A confirmation popup appears before submitting the form.
    -   A success popup appears after the product has been successfully added, with options to add another product or view the inventory.

## Data Flow and State Management

The entire form's state and logic are managed by a single custom hook:

-   **`useInventoryForm` (`@/hooks/use-inventory-form.ts`)**:
    -   This hook centralizes all form-related logic.
    -   It manages the `formData` object, which holds the state of all input fields.
    -   It handles validation and stores `errors`.
    -   It fetches necessary data like `brands`, `categories`, and `specifications` from the respective stores.
    -   It contains the `handleSubmit` and `confirmSubmit` functions that process and save the new product data.
    -   It also controls the visibility of the success and confirmation popups.

## User Interaction Flow

1.  **Fill Basic Info**: The user selects a category and brand, and enters a description and initial stock quantity.
2.  **Dynamic Fields Appear**: Once a category is selected, the `DynamicSpecificationFields` component renders the specific fields required for that category.
3.  **Enter Specifications**: The user fills out the dynamic specification fields.
4.  **Enter Pricing**: The user provides the purchase and selling prices.
5.  **Submit Form**: The user clicks the "Add Product" button.
6.  **Confirm Submission**: A confirmation modal appears asking the user to confirm the action.
7.  **Success Notification**: After successful submission, a success popup is displayed, confirming that the product has been added to the inventory.
