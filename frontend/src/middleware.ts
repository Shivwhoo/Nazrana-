import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip admin auth for vendor and recipient routes
  if (path.startsWith('/vendor') || path.startsWith('/r/')) {
    return NextResponse.next();
  }

  const session = await auth();
  
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register');
  
  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
