import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { auth } from '@clerk/nextjs/server';

type ShopStatus = 'offline' | 'online' | 'at_shop';

interface OnlineStatusDoc {
  _id: string;
  _type: 'online';
  isOnline?: boolean;
  atShop?: boolean;
  updatedAt?: string;
  _updatedAt?: string;
  note?: string;
}

// Create a server-side Sanity client with proper error handling
const getSanityClient = () => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'idji8ni7';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'live-shop';
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

  if (!token) {
    console.error('Sanity API token is not configured');
    throw new Error('Server configuration error');
  }

  return createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: '2024-01-01',
    perspective: 'published',
  });
};

// Map Sanity's format to our status
const mapStateToStatus = ({ isOnline, atShop }: { isOnline?: boolean; atShop?: boolean }): ShopStatus => {
  if (!isOnline) return 'offline';
  return atShop ? 'at_shop' : 'online';
};

export async function POST(req: Request) {
  try {
    console.log('Received POST request to /api/shop-status');
    
    // Verify authentication
    const { userId } = auth();
    
    if (!userId) {
      console.error('No user ID found in session');
      return NextResponse.json(
        { error: 'Unauthorized - No user session' },
        { status: 401 }
      );
    }

    const sanityClient = getSanityClient();

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { isOnline, atShop, note, updatedAt } = body as {
      isOnline: boolean;
      atShop: boolean;
      note?: string;
      updatedAt: string;
    };

    if (typeof isOnline !== 'boolean' || typeof atShop !== 'boolean') {
      console.error('Invalid payload format:', { isOnline, atShop });
      return NextResponse.json(
        { error: 'Invalid payload format. Expected isOnline and atShop as booleans' },
        { status: 400 }
      );
    }

    console.log('Updating Sanity document with:', { isOnline, atShop, note, updatedAt });
    
    try {
      console.log('Checking for existing onlineStatus document');
      const existingDoc = await sanityClient.fetch('*[_id == "onlineStatus"][0]');
      
      if (!existingDoc) {
        console.log('No existing onlineStatus document, creating new one');
        await sanityClient.create({
          _id: 'onlineStatus',
          _type: 'online',
          isOnline,
          atShop,
          note: note || '',
          updatedAt: updatedAt || new Date().toISOString()
        });
      } else {
        // Update existing document
        console.log('Updating existing onlineStatus document');
        await sanityClient
          .patch('onlineStatus')
          .set({
            isOnline,
            atShop,
            note: note || '',
            updatedAt: updatedAt || new Date().toISOString(),
          })
          .commit();
      }
    } catch (error) {
      console.error('Error in document operation:', error);
      if (error instanceof Error) {
        return NextResponse.json(
          { error: 'Failed to update shop status', details: error.message },
          { status: 500 }
        );
      }
      throw error;
    }

    // Return the updated status
    const status = mapStateToStatus({ isOnline, atShop });
    console.log('Successfully updated status to:', status);
    
    return NextResponse.json({ 
      isOnline,
      atShop,
      status
    });
  } catch (error) {
    console.error('Error in POST /api/shop-status:', error);
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update shop status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.error('No user ID found in session (GET)');
      return NextResponse.json(
        { error: 'Unauthorized - No user session' },
        { status: 401 }
      );
    }

    // Fetch the current status from Sanity
    const statusDoc = await sanityClient.getDocument<OnlineStatusDoc>('onlineStatus');
    
    // If no status document exists, create one
    if (!statusDoc) {
      const newStatus = { 
        _id: 'onlineStatus',
        _type: 'online',
        isOnline: false,
        atShop: false,
        updatedAt: new Date().toISOString()
      };
      
      await sanityClient.create(newStatus);
      return NextResponse.json({ status: 'offline' });
    }
    
    const status = mapStateToStatus({
      isOnline: statusDoc.isOnline,
      atShop: statusDoc.atShop
    });
    
    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error fetching shop status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop status' },
      { status: 500 }
    );
  }
}
