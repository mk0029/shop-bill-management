import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// This ensures the route is protected by Clerk
export const middleware = [];

// This ensures the route is not cached
export const revalidate = 0;
