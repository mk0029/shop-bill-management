# Bill Creation Page (`/admin/billing/create`)

This document outlines the structure and functionality of the bill creation page. The page is designed with a modular architecture, composing several smaller components to handle different parts of the bill creation process.

## Page Structure

The main page is located at `src/app/admin/billing/create/page.tsx`. It uses a two-column layout on larger screens:
- **Main Content (Left/Top):** Contains customer information, item selection, and the list of selected items.
- **Sidebar (Right/Bottom):** Displays a summary of the bill and the final submission button.

## Components Used

The page is built from the following reusable components found in `src/components/billing/`:

-   **`CustomerInfoSection`**:
    -   Allows the user to select an existing customer from a dropdown.
    -   Displays basic customer information.
    -   Handles the `customerId` part of the form state.

-   **`ItemSelectionSection`**:
    -   Provides a way to browse product categories.
    -   Triggers the `ItemSelectionModal` for a selected category.

-   **`SelectedItemsList`**:
    -   Displays a list of all items added to the bill.
    -   Allows users to adjust the quantity of each item.
    -   Allows users to remove items from the bill.
    -   Provides an option to clear all selected items.

-   **`BillSummarySidebar`**:
    -   Shows the selected customer's details.
    -   Displays the subtotal, tax (if any), and total amount.
    -   Contains the "Create Bill" button to submit the form.

-   **`ItemSelectionModal`**:
    -   A modal window that opens when a category is selected in `ItemSelectionSection`.
    -   Displays all products within the selected category.
    -   Provides filters for brand and specifications to narrow down the product list.
    -   Allows the user to add items to the bill.

-   **`ConfirmationModal`**:
    -   A generic modal used to show success messages (e.g., "Bill Created Successfully!") or alerts.

## Data Flow and State Management

The page relies on several custom hooks to manage state and data fetching:

-   **`useBillForm` (`@/hooks/use-bill-form.ts`)**:
    -   Manages the central state of the bill form, including `formData`, `selectedItems`, and loading/modal states.
    -   Contains functions for handling input changes, adding/removing items, calculating totals, and submitting the form.

-   **`useItemSelection` (`@/hooks/use-item-selection.ts`)**:
    -   Manages the state of the `ItemSelectionModal`, including its visibility and the selected filters.

-   **Data Fetching Hooks (`@/hooks/use-sanity-data.ts`)**:
    -   `useCustomers`: Fetches the list of all customers.
    -   `useProducts`: Fetches all active products available for sale.
    -   `useBrands`: Fetches all brands.
    -   `useCategories`: Fetches all product categories.

## User Interaction Flow

1.  **Select Customer**: The user starts by selecting a customer from the dropdown in the `CustomerInfoSection`.
2.  **Open Item Modal**: The user clicks on a category in the `ItemSelectionSection` to open the `ItemSelectionModal`.
3.  **Filter and Add Items**: Inside the modal, the user can filter items by brand or specifications and add them to the bill.
4.  **Review Selected Items**: Added items appear in the `SelectedItemsList`, where quantities can be adjusted or items removed.
5.  **View Summary**: The `BillSummarySidebar` updates in real-time to show the total cost.
6.  **Submit Bill**: The user clicks the "Create Bill" button in the sidebar to finalize and save the bill.
7.  **Confirmation**: A success modal appears confirming the bill has been created.
