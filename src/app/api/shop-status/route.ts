import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { notificationService } from '@/lib/notification-service';
import { getShopStatusMessage, getShopStatusMessages } from '@/lib/shop-status-messages.server';

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
  const projectId = process.env.SANITY_PROJECT_ID || 'idji8ni7';
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'live-shop';
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;

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
    // Verify authentication via custom header (admin only)
    const roleHeader = (req.headers.get('x-user-role') || '').toLowerCase();
    if (roleHeader !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const sanityClient = getSanityClient();

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
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

    
    try {
      const existingDoc = await sanityClient.fetch('*[_id == "onlineStatus"][0]');
      // Compute previous status for notification decisioning
      const prevStatus: ShopStatus | undefined = existingDoc
        ? mapStateToStatus({ isOnline: existingDoc?.isOnline, atShop: existingDoc?.atShop })
        : undefined;

      if (!existingDoc) {
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

      // Decide if we need to broadcast an FCM notification
      const newStatus = mapStateToStatus({ isOnline, atShop });
      const statusChanged = !prevStatus || prevStatus !== newStatus;
      if (statusChanged) {
        try {
          const actorUserId = (req.headers.get('x-user-id') || '').trim();
          if (actorUserId) {
            const messages = await getShopStatusMessages();
            const message = getShopStatusMessage(messages, newStatus);
            await notificationService.emit({
              type: 'shop_status',
              actorUserId,
              data: {
                status: newStatus,
                route: '/admin/settings',
                extra: { title: message.title, body: message.body },
              },
            })
          }
        } catch (notifyErr) {
          console.error('Unified notification error (shop-status):', notifyErr);
        }
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
    // Public GET (used by client to read status); no Clerk auth required

    // Fetch the current status from Sanity
    const client = getSanityClient();
    const statusDoc = await client.getDocument<OnlineStatusDoc>('onlineStatus');
    
    // If no status document exists, create one
    if (!statusDoc) {
      const newStatus = { 
        _id: 'onlineStatus',
        _type: 'online',
        isOnline: false,
        atShop: false,
        updatedAt: new Date().toISOString()
      };
      
      await client.create(newStatus);
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
