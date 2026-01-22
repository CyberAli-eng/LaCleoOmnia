import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  
  // Check for token in cookies (set by login)
  const token = request.cookies.get('token')?.value;
  
  // If accessing dashboard without token, redirect to login
  if (path.startsWith('/dashboard') && !token) {
    const loginUrl = new URL('/login', request.url);
    // Add return URL for redirect after login
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user has token and tries to access login/register, redirect to dashboard
  if (token && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Block access to old /api/auth/* routes (except login/register which are handled by backend)
  if (path.startsWith('/api/auth/') && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/api/auth/:path*'
  ],
};
