import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

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
        _type,
        clerkId,
        customerId,
        secretKey,
        name,
        email,
        phone,
        location,
        role,
        avatar,
        "isActive": select(
          defined(isActive) => isActive,
          true
        ),
        "createdAt": select(
          defined(createdAt) => createdAt,
          _createdAt
        ),
        "updatedAt": select(
          defined(updatedAt) => updatedAt,
          _updatedAt
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

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
