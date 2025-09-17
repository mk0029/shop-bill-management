import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const publicPaths = [
  "/",
  "/api/webhook(.*)",
  "/api/uploadthing",
  "/api/chat(.*)", // Allow all chat API routes
];

const isPublic = (path: string) => {
  return publicPaths.some(publicPath => 
    path === publicPath || 
    path.startsWith(publicPath.replace('(.*)', ''))
  );
};

export default async function middleware(request: NextRequest) {
  // Skip middleware for public paths
  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  try {
    // Check for user ID in the session
    const session = await auth();
    const userId = session?.userId;
    
    // If no user ID, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', request.url);
      return NextResponse.redirect(signInUrl);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
