import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get the token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token || !token.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify the token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default_secret_for_dev'
    );

    const { payload } = await jwtVerify(token.value, secret);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Token is valid
    return NextResponse.json({ message: 'Authenticated' }, { status: 200 });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}