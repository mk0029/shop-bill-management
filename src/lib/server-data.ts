import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import { sanityClient, queries } from "@/lib/sanity";

export type AdminDashboardData = {
  products: unknown[];
  brands: unknown[];
  categories: unknown[];
  customers: unknown[];
  bills: unknown[];
};

export type CustomerBillsData = {
  customer: Record<string, unknown> | null;
  bills: unknown[];
};

export type AdminSpecificationsData = {
  specificationOptions: unknown[];
  categoryFieldMappings: unknown[];
};

export type AdminBillingData = {
  bills: unknown[];
  customers: unknown[];
  products: unknown[];
  brands: unknown[];
  categories: unknown[];
};

export type AdminCustomersData = {
  customers: unknown[];
  bills: unknown[];
};

export type AdminInventoryData = {
  products: unknown[];
  brands: unknown[];
  categories: unknown[];
};

export type FittingRatesDoc = {
  _id: "fittingRates";
  _type: "fitting_rates";
  rates: {
    underground: number;
    open_pvc: number;
    open_wire: number;
  };
  updatedAt: string;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  noStore();
  const [products, brands, categories, customers, bills] = await Promise.all([
    sanityClient.fetch(queries.activeProducts),
    sanityClient.fetch(queries.brands),
    sanityClient.fetch(queries.categories),
    sanityClient.fetch(queries.customers),
    sanityClient.fetch(queries.bills),
  ]);

  return {
    products: Array.isArray(products) ? products : [],
    brands: Array.isArray(brands) ? brands : [],
    categories: Array.isArray(categories) ? categories : [],
    customers: Array.isArray(customers) ? customers : [],
    bills: Array.isArray(bills) ? bills : [],
  };
}

export async function getCustomerBillsData(opts: {
  userId?: string | null;
  customerId?: string | null;
}): Promise<CustomerBillsData> {
  noStore();
  const { userId, customerId } = opts;
  const cid = customerId || userId || "";
  if (!cid) {
    return { customer: null, bills: [] };
  }

  const customerQuery =
    "*[_type == 'user' && (_id == $userId || customerId == $customerId)][0]";

  const [customer, bills] = await Promise.all([
    sanityClient.fetch(customerQuery, { userId: userId || "", customerId: customerId || "" }),
    sanityClient.fetch(queries.customerBills(String(cid))),
  ]);

  return {
    customer: customer || null,
    bills: Array.isArray(bills) ? bills : [],
  };
}

export async function getAdminSpecificationsData(): Promise<AdminSpecificationsData> {
  noStore();
  const [specificationOptions, categoryFieldMappings] = await Promise.all([
    sanityClient.fetch(
      `*[_type == "specificationOption" && isActive == true] {
        _id,
        type,
        value,
        label,
        sortOrder,
        description,
        categories,
        isActive
      } | order(type asc, sortOrder asc)`
    ),
    sanityClient.fetch(
      `*[_type == "categoryFieldMapping" && isActive == true] {
        _id,
        category-> {
          _id,
          name,
          slug
        },
        categoryType,
        requiredFields[]-> {
          _id,
          fieldKey,
          fieldLabel,
          fieldType,
          description,
          placeholder,
          validationRules,
          defaultValue,
          sortOrder,
          isActive,
          applicableCategories,
          conditionalLogic
        },
        optionalFields[]-> {
          _id,
          fieldKey,
          fieldLabel,
          fieldType,
          description,
          placeholder,
          validationRules,
          defaultValue,
          sortOrder,
          isActive,
          applicableCategories,
          conditionalLogic
        },
        description,
        isActive
      } | order(category->name asc)`
    ),
  ]);

  return {
    specificationOptions: Array.isArray(specificationOptions) ? specificationOptions : [],
    categoryFieldMappings: Array.isArray(categoryFieldMappings) ? categoryFieldMappings : [],
  };
}

export async function getAdminBillingData(): Promise<AdminBillingData> {
  noStore();
  const [bills, customers, products, brands, categories] = await Promise.all([
    sanityClient.fetch(queries.bills),
    sanityClient.fetch(queries.customers),
    sanityClient.fetch(queries.activeProducts),
    sanityClient.fetch(queries.brands),
    sanityClient.fetch(queries.categories),
  ]);

  return {
    bills: Array.isArray(bills) ? bills : [],
    customers: Array.isArray(customers) ? customers : [],
    products: Array.isArray(products) ? products : [],
    brands: Array.isArray(brands) ? brands : [],
    categories: Array.isArray(categories) ? categories : [],
  };
}

export async function getAdminCustomersData(): Promise<AdminCustomersData> {
  noStore();
  const [customers, bills] = await Promise.all([
    sanityClient.fetch(queries.customers),
    sanityClient.fetch(queries.bills),
  ]);

  return {
    customers: Array.isArray(customers) ? customers : [],
    bills: Array.isArray(bills) ? bills : [],
  };
}

export async function getAdminInventoryData(): Promise<AdminInventoryData> {
  noStore();
  const [products, brands, categories] = await Promise.all([
    sanityClient.fetch(queries.activeProducts),
    sanityClient.fetch(queries.brands),
    sanityClient.fetch(queries.categories),
  ]);

  return {
    products: Array.isArray(products) ? products : [],
    brands: Array.isArray(brands) ? brands : [],
    categories: Array.isArray(categories) ? categories : [],
  };
}

export async function getFittingRates(): Promise<FittingRatesDoc | null> {
  noStore();
  const query = `*[_type == "fitting_rates" && _id == "fittingRates"][0]`;
  const data = await sanityClient.fetch(query);
  return data || null;
}

