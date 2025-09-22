import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

// Helper function to mask phone numbers
function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Keep last 4 digits visible, mask the rest with *
  const visibleDigits = 4;
  const masked = phone.slice(-visibleDigits).padStart(phone.length, '*');
  return masked;
}

export async function GET(
  request: Request,
  { params }: { params: { secretKey: string } }
) {
  const { secretKey } = params;

  try {
    // Query Sanity for a single customer by secretKey
    const query = `
      *[_type == "user" && secretKey == $secretKey][0] {
        _id,
        customerId,
        name,
        phone,
        location,
        role,
        "isActive": select(
          defined(isActive) => isActive,
          true
        )
      }
    `;

    const customer = await sanityClient.fetch(query, { secretKey });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Return only the essential customer data
    const maskedCustomer = {
      id: customer?._id,
      customerId: customer?.customerId,
      name: customer?.name,
      phone: customer?.phone ? maskPhoneNumber(customer.phone) : null,
      location: customer?.location,
      isActive: customer?.isActive
    };

    return NextResponse.json(maskedCustomer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
