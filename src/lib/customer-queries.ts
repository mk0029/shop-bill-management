import { sanityClient } from "./sanity";

// Get customer by ID with minimal fields
export const getCustomerById = async (customerId: string) => {
  const query = `
    *[_type == "user" && _id == $customerId][0] {
      _id,
      name,
      email,
      phone,
      role,
      address,
      location {
        address,
        city,
        state,
        pincode,
        coordinates
      },
      isActive
    }
  `;

  return await sanityClient.fetch(query, { customerId });
};

// Get customer's bills with related product details
export const getCustomerBills = (customerId: string) => {
  const query = `
    *[_type == "bill" && (customer._ref == $customerId || customer._id == $customerId)] | order(_createdAt desc) {
      _id,
      _createdAt,
      _updatedAt,
      billNumber,
      status,
      paymentStatus,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentMethod,
      paymentDate,
      dueDate,
      serviceDate,
      serviceType,
      locationType,
      notes,
      items[] {
        _key,
        product-> {
          _id,
          name,
          sku,
          price,
          image,
          category-> {
            _id,
            name,
            slug
          }
        },
        quantity,
        unitPrice,
        totalPrice,
        specifications
      },
      customer-> {
        _id,
        name,
        phone,
        email
      },
      createdBy-> {
        _id,
        name
      },
      updatedBy-> {
        _id,
        name
      }
    }
  `;

  return sanityClient.fetch(query, { customerId });
};

// Subscribe to real-time updates for customer's bills
export const subscribeToCustomerBills = (customerId: string, callback: (bills: any[]) => void) => {
  const query = `
    *[_type == "bill" && (customer._ref == $customerId || customer._id == $customerId)] {
      _id,
      _createdAt,
      _updatedAt,
      billNumber,
      status,
      paymentStatus,
      totalAmount,
      paidAmount,
      balanceAmount
    }
  `;

  const subscription = sanityClient
    .listen(query, { customerId })
    .subscribe((update) => {
      if (update.result) {
        // When we get an update, refetch the full bill data
        getCustomerBills(customerId).then(callback);
      }
    });

  return () => subscription.unsubscribe();
};

// Get customer's recent activity (bills, payments, etc.)
export const getCustomerActivity = async (customerId: string, limit = 5) => {
  const query = `
    {
      "bills": *[_type == "bill" && (customer._ref == $customerId || customer._id == $customerId)] | order(_createdAt desc) [0...$limit] {
        _id,
        _createdAt,
        billNumber,
        totalAmount,
        paymentStatus,
        status
      },
      "payments": *[_type == "payment" && (customer._ref == $customerId || customer._id == $customerId)] | order(date desc) [0...$limit] {
        _id,
        _createdAt,
        amount,
        paymentMethod,
        status,
        bill-> {
          _id,
          billNumber
        }
      }
    }
  `;

  return await sanityClient.fetch(query, { customerId, limit });
};
