import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow access to login page and API routes
  if (request.nextUrl.pathname === '/login' || 
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // For all other routes, we'll let the client-side handle authentication
  // since we're using localStorage for token storage
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};