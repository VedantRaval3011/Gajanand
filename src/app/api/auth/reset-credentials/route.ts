import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
    let userEmail = null;
    
    if (type === 'email') {
      if (!emailOTP) {
        return NextResponse.json(
          { error: 'Email OTP is required' },
          { status: 400 }
        );
      }
      
      // Find the OTP document and get the associated email
      const emailOTPDoc = await OTP.findOne({ otp: emailOTP, type: 'email' });
      
      if (!emailOTPDoc) {
        return NextResponse.json(
          { error: 'Invalid or expired OTP' },
          { status: 400 }
        );
      }
      
      userEmail = emailOTPDoc.email; // Make sure your OTP model stores the email
      
      // Delete the used OTP
      await OTP.deleteOne({ otp: emailOTP, type: 'email' });
    } else {
      return NextResponse.json(
        { error: 'Invalid verification type' },
        { status: 400 }
      );
    }
    
    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username, 
      email: { $ne: userEmail } // Not the current user's email
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user credentials - find by email and update both username and password
    const updatedUser = await User.findOneAndUpdate(
      { email: userEmail },
      { username, password: hashedPassword },
      { new: true }
    );
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
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