# Inventory Listing Page (`/admin/inventory`)

This document describes the structure and functionality of the main inventory management page, which serves as the central hub for viewing and managing all products.

## Page Structure

The main page component, `InventoryPage`, is located at `src/app/admin/inventory/page.tsx`. It is composed of four distinct components, each responsible for a specific part of the UI:

-   **`InventoryHeader`**: Displays key statistics and primary actions.
-   **`InventoryFilters`**: Provides tools for searching, filtering, and sorting the inventory list.
-   **`InventoryTable`**: Renders the list of products.
-   **`InventoryDialogs`**: Manages modals for editing and deleting products.

## Components Used

-   **`InventoryHeader` (`@/components/inventory/inventory-header.tsx`)**:
    -   Displays summary cards with statistics like "Total Products," "Total Inventory Value," "Low Stock," and "Out of Stock."
    -   Contains the "Add New Product" button, which navigates to the `/admin/inventory/add` page.

-   **`InventoryFilters` (`@/components/inventory/inventory-filters.tsx`)**:
    -   Includes a search bar for finding products by name.
    -   Provides dropdowns to filter the product list by `Category` and `Brand`.
    -   Allows sorting the inventory by fields like `name` or `createdAt` in ascending or descending order.

-   **`InventoryTable` (`@/components/inventory/inventory-table.tsx`)**:
    -   Displays the filtered and sorted list of products in a table format.
    -   Each row represents a product and shows key details like name, category, brand, price, and stock status.
    -   Each row includes "Edit" and "Delete" buttons to manage the product.

-   **`InventoryDialogs` (`@/components/inventory/inventory-dialogs.tsx`)**:
    -   This component is responsible for handling the modals (dialogs) for editing a product and confirming a deletion.
    -   It does not render any visible UI by default but shows the appropriate modal when triggered.

## Data Flow and State Management

All the logic, state management, and data fetching for the inventory page are centralized in a single custom hook:

-   **`useInventoryManagement` (`@/hooks/use-inventory-management.ts`)**:
    -   This hook is the brain of the inventory page.
    -   It fetches all necessary data, including `products`, `brands`, and `categories`.
    -   It manages the state for filters, search terms, and sorting (`searchTerm`, `selectedCategory`, `selectedBrand`, `sortBy`, `sortOrder`).
    -   It provides all the functions for handling user actions, such as `handleDeleteProduct`, `handleEditProduct`, and `handleUpdateProduct`.
    -   It also controls the visibility of the edit and delete dialogs (`showDeleteDialog`, `showEditDialog`).

## User Interaction Flow

1.  **View Inventory**: The user lands on the page and sees a table of all products.
2.  **Filter and Sort**: The user can use the filters to narrow down the list of products based on search criteria, category, or brand. They can also sort the list.
3.  **Manage Products**:
    -   **Edit**: Clicking the "Edit" button on a product opens a modal (managed by `InventoryDialogs`) where the user can update the product's details.
    -   **Delete**: Clicking the "Delete" button opens a confirmation modal. Upon confirmation, the product is removed from the inventory.
4.  **Add New Product**: Clicking the "Add New Product" button in the header navigates the user to the form for adding a new inventory item.
