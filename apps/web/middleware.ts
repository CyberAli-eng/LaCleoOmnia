import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check for token in cookies (set by login)
  const token = request.cookies.get('token')?.value;
  
  // If accessing dashboard without token, redirect to login
  if (path.startsWith('/dashboard') && !token) {
    // Check if token exists in Authorization header (for API calls)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Block access to /api/auth/* routes (NextAuth routes that no longer exist)
  if (path.startsWith('/api/auth/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/auth/:path*'],
};
