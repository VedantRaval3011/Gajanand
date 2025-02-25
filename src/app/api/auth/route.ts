import { NextResponse } from 'next/server';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';
import { SignJWT } from 'jose';
import { Document } from 'mongoose';

// Define the User interface
interface IUser {
  _id: string;
  username: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export async function POST(req: Request) {
  await dbConnect();
  const { username, password } = await req.json();

  try {
    const user = await User.findOne({ username }) as (Document<unknown, Record<string, unknown>, IUser> & IUser);


    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default_secret_for_dev'
    );

    // Convert _id to string explicitly
    const token = await new SignJWT({ userId: user._id.toString() })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('12h') // or alternatively: `${12 * 60 * 60}s` for 12 hours in seconds
      .setIssuedAt()
      .sign(secret);

    const response = NextResponse.json(
      { message: 'Login successful' },
      { status: 200 }
    );
    
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60, // 12 hours in seconds
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}