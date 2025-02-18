import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Convert your secret to Uint8Array
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_for_dev'
);

export async function middleware(req: any) {
  // Skip middleware for login page to avoid redirect loop
  if (req.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;

  // If no token is found, redirect to the login page
  if (!token) {
    console.log("no token");
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Verify the token using jose
    const { payload } = await jwtVerify(token, secret);
    req.user = payload;
  } catch (error) {
    // If the token is invalid or expired, redirect to the login page
    console.log("invalid token");
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('token');
    return response;
  }

  // If the token is valid, allow access to the requested route
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|login|_next/static|_next/image|favicon.ico|reset-credentials).*)',
  ],
};