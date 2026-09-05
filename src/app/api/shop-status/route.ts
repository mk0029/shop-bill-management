import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification-service';
import { getShopStatusMessage, getShopStatusMessages } from '@/lib/shop-status-messages.server';
import { sanityClient } from '@/lib/sanity';
import { getSanityClient } from '@/lib/sanity/client-factory';
import { createDocument, updateDocument } from '@/lib/sanity/write-router';

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

const GET_STATUS_QUERY = `*[_id == "onlineStatus"][0]{ _id, _type, isOnline, atShop, updatedAt, note }`;

async function readOnlineStatus() {
  const commsDoc = await getSanityClient('comms')
    .fetch<OnlineStatusDoc | null>(GET_STATUS_QUERY)
    .catch(() => null);
  if (commsDoc) return commsDoc;
  const primaryDoc = await sanityClient
    .fetch<OnlineStatusDoc | null>(GET_STATUS_QUERY)
    .catch(() => null);
  return primaryDoc || null;
}

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

    const sanityClient = getSanityClient('comms');

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
      const existingDoc = await readOnlineStatus();
      // Compute previous status for notification decisioning
      const prevStatus: ShopStatus | undefined = existingDoc
        ? mapStateToStatus({ isOnline: existingDoc?.isOnline, atShop: existingDoc?.atShop })
        : undefined;

      if (!existingDoc) {
        const doc = {
          _type: 'online',
          isOnline,
          atShop,
          note: note || '',
          updatedAt: updatedAt || new Date().toISOString()
        };
        const writeResult = await createDocument(doc, 'shop-status', { documentId: 'onlineStatus' });
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to create onlineStatus');
        }
      } else {
        // Update existing document
        const patch = {
          isOnline,
          atShop,
          note: note || '',
          updatedAt: updatedAt || new Date().toISOString(),
        };
        const writeResult = await updateDocument('onlineStatus', patch, 'shop-status');
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to update onlineStatus');
        }
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

    // Fetch the current status from Sanity (comms first, primary fallback)
    const statusDoc = await readOnlineStatus();
    
    // If no status document exists, create one
    if (!statusDoc) {
      const newStatus = { 
        _type: 'online',
        isOnline: false,
        atShop: false,
        updatedAt: new Date().toISOString()
      };
      await createDocument(newStatus, 'shop-status', { documentId: 'onlineStatus' }).catch(() => {});
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
