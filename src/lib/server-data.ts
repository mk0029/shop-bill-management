import { unstable_cache } from "next/cache";
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

export type AdminChatRoom = {
  _id: string;
  roomName?: string;
  customer?: { _id?: string; name?: string; phone?: string };
  admins?: Array<{ _id?: string; name?: string }>;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadForCustomer?: number;
  unreadForAdmins?: number;
  createdAt?: string;
  updatedAt?: string;
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

export type CustomerChatRoom = AdminChatRoom;

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

export const getAdminDashboardData = unstable_cache(
  async (): Promise<AdminDashboardData> => {
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
  },
  ["admin-dashboard-data"],
  { revalidate: 300 }
);

export const getCustomerBillsData = unstable_cache(
  async (opts: { userId?: string | null; customerId?: string | null }): Promise<CustomerBillsData> => {
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
  },
  ["customer-bills-data"],
  { revalidate: 120 }
);

export const getAdminSpecificationsData = unstable_cache(
  async (): Promise<AdminSpecificationsData> => {
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
  },
  ["admin-specifications-data"],
  { revalidate: 300 }
);

export async function getAdminChatRooms(opts?: {
  customerId?: string | null;
  adminId?: string | null;
}): Promise<AdminChatRoom[]> {
  const customerId = opts?.customerId || "";
  const adminId = opts?.adminId || "";

  const fetcher = unstable_cache(
    async () => {
      let filter = "_type == \"chatRoom\"";
      const params: Record<string, unknown> = {};

      if (customerId) {
        filter += " && customer._ref == $customerId";
        params.customerId = customerId;
      }

      if (adminId) {
        filter += " && $adminId in admins[]._ref";
        params.adminId = adminId;
      }

      const where = filter === "_type == \"chatRoom\"" ? filter : `(${filter})`;
      const query = `*[${where}] | order(coalesce(lastMessageAt, createdAt) desc) {
        _id,
        roomName,
        customer-> { _id, name, phone },
        admins[]-> { _id, name },
        lastMessage,
        lastMessageAt,
        unreadForCustomer,
        unreadForAdmins,
        createdAt,
        updatedAt
      }`;

      const data = await sanityClient.fetch(query, params);
      return Array.isArray(data) ? (data as AdminChatRoom[]) : [];
    },
    ["admin-chat-rooms", customerId || "all", adminId || "all"],
    { revalidate: 60 }
  );

  return fetcher();
}

export const getCustomerChatRooms = unstable_cache(
  async (customerId: string): Promise<CustomerChatRoom[]> => {
    if (!customerId) return [];
    const query = `*[_type == "chatRoom" && customer._ref == $customerId] | order(coalesce(lastMessageAt, createdAt) desc) {
      _id,
      roomName,
      customer-> { _id, name, phone },
      admins[]-> { _id, name },
      lastMessage,
      lastMessageAt,
      unreadForCustomer,
      unreadForAdmins,
      createdAt,
      updatedAt
    }`;
    const data = await sanityClient.fetch(query, { customerId });
    return Array.isArray(data) ? (data as CustomerChatRoom[]) : [];
  },
  ["customer-chat-rooms"],
  { revalidate: 30 }
);

export const getAdminBillingData = unstable_cache(
  async (): Promise<AdminBillingData> => {
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
  },
  ["admin-billing-data"],
  { revalidate: 120 }
);

export const getAdminCustomersData = unstable_cache(
  async (): Promise<AdminCustomersData> => {
    const [customers, bills] = await Promise.all([
      sanityClient.fetch(queries.customers),
      sanityClient.fetch(queries.bills),
    ]);

    return {
      customers: Array.isArray(customers) ? customers : [],
      bills: Array.isArray(bills) ? bills : [],
    };
  },
  ["admin-customers-data"],
  { revalidate: 120 }
);

export const getAdminInventoryData = unstable_cache(
  async (): Promise<AdminInventoryData> => {
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
  },
  ["admin-inventory-data"],
  { revalidate: 120 }
);

export const getFittingRates = unstable_cache(
  async (): Promise<FittingRatesDoc | null> => {
    const query = `*[_type == "fitting_rates" && _id == "fittingRates"][0]`;
    const data = await sanityClient.fetch(query);
    return data || null;
  },
  ["fitting-rates"],
  { revalidate: 60 }
);
