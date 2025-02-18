import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyOTPs } from '@/lib/otp';
import User from '@/models/User';
import { OTP } from '@/models/OTP';
import dbConnect from '@/lib/dbConnect';

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { type, emailOTP, username, newPassword } = await request.json();

    // Validate input
    if (!username || !newPassword) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify OTPs based on type
    let otpVerified = false;

     if (type === 'email') {
      if (!emailOTP) {
        return NextResponse.json(
          { error: 'Email OTP is required' },
          { status: 400 }
        );
      }
      const emailOTPDoc = await OTP.findOne({ otp: emailOTP, type: 'email' });
      otpVerified = !!emailOTPDoc;
      if (otpVerified) {
        await OTP.deleteOne({ otp: emailOTP, type: 'email' });
      }
    } 

    if (!otpVerified) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user credentials
    const updatedUser = await User.findOneAndUpdate(
      { username }, // Find user by username
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user credentials' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Credentials updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting credentials:', error);
    return NextResponse.json(
      { error: 'Failed to reset credentials' },
      { status: 500 }
    );
  }
}