import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for login page and API routes
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for authentication cookies
  const token = request.cookies.get('daleel_token')?.value;
  const expires = request.cookies.get('daleel_expires')?.value;
// test update
  // If no token or expires, redirect to login
  if (!token || !expires) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if token is expired
  const expiryTime = new Date(expires).getTime();
  const currentTime = new Date().getTime();
  
  if (expiryTime <= currentTime) {
    // Token expired, clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('daleel_token', '', { expires: new Date(0) });
    response.cookies.set('daleel_user', '', { expires: new Date(0) });
    response.cookies.set('daleel_expires', '', { expires: new Date(0) });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
