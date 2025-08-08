# Customer Components

This directory contains all customer-related UI components that have been refactored from the original monolithic customers page.

## 🧩 Component Structure

### Core Components

- **`customers-page-header.tsx`** - Page header with title and add customer button
- **`customer-stats-cards.tsx`** - Statistics cards showing customer metrics
- **`customer-search-filters.tsx`** - Search input and filter dropdown
- **`customer-table.tsx`** - Main table container with loading and empty states
- **`customer-table-row.tsx`** - Individual table row component
- **`customer-detail-modal.tsx`** - Modal for viewing customer details

### Supporting Files

- **`index.ts`** - Barrel exports for clean imports
- **`README.md`** - This documentation file

## 🔧 Usage

### Basic Import
```tsx
import { CustomerTable, CustomerStatsCards } from "@/components/customers";
```

### Individual Import
```tsx
import CustomerTable from "@/components/customers/customer-table";
```

## 📊 Component Props

### CustomersPageHeader
```tsx
interface CustomersPageHeaderProps {
  onAddCustomer: () => void;
}
```

### CustomerStatsCards
```tsx
interface CustomerStatsCardsProps {
  stats: CustomerStats;
  isLoading: boolean;
}
```

### CustomerSearchFilters
```tsx
interface CustomerSearchFiltersProps {
  filters: CustomerFilters;
  onSearchChange: (searchTerm: string) => void;
  onFilterChange: (filterActive: "all" | "active" | "inactive") => void;
}
```

### CustomerTable
```tsx
interface CustomerTableProps {
  customers: CustomerWithStats[];
  isLoading: boolean;
  searchTerm: string;
  onViewCustomer: (customer: CustomerWithStats) => void;
  onEditCustomer?: (customer: CustomerWithStats) => void;
  onDeleteCustomer: (customerId: string) => void;
}
```

### CustomerDetailModal
```tsx
interface CustomerDetailModalProps {
  customer: CustomerWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onViewBills?: (customer: CustomerWithStats) => void;
  onEditCustomer?: (customer: CustomerWithStats) => void;
}
```

## 🎨 Design Patterns

### Composition Pattern
Components are designed to be composed together rather than being monolithic:

```tsx
<div className="space-y-6">
  <CustomersPageHeader onAddCustomer={handleAdd} />
  <CustomerStatsCards stats={stats} isLoading={loading} />
  <CustomerSearchFilters 
    filters={filters} 
    onSearchChange={setSearch}
    onFilterChange={setFilter}
  />
  <CustomerTable 
    customers={filteredCustomers}
    onViewCustomer={handleView}
    onEditCustomer={handleEdit}
    onDeleteCustomer={handleDelete}
  />
</div>
```

### Separation of Concerns
- **UI Components**: Handle presentation and user interactions
- **Hooks**: Manage state and business logic
- **Utils**: Provide pure utility functions
- **Types**: Define TypeScript interfaces

## 🔄 State Management

Components use custom hooks for state management:

- **`useCustomerStats`** - Calculates customer statistics
- **`useCustomerFilters`** - Manages search and filter state
- **`useCustomerActions`** - Handles navigation and actions

## 🎯 Benefits of Refactoring

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: Components can be used in different contexts
3. **Testability**: Smaller components are easier to test
4. **Maintainability**: Changes are isolated to specific components
5. **Type Safety**: Full TypeScript support with proper interfaces
6. **Performance**: Better optimization opportunities with smaller components

## 🚀 Future Enhancements

- Add sorting functionality to table headers
- Implement bulk actions for multiple customers
- Add export functionality
- Implement advanced filtering options
- Add customer activity timeline
- Integrate with WhatsApp for direct messaging