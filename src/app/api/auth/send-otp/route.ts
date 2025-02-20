import { NextResponse } from 'next/server';
import { generateOTP, storeOTP } from '@/lib/otp';
import { sendEmail } from '@/lib/email'; // Utility for sending emails
import dbConnect from '@/lib/dbConnect';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { type } = await request.json();

    // Validate the OTP type
    if (!['email'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid OTP type.' },
        { status: 400 }
      );
    }

    let message = '';

    // Handle Email OTP
    if ( type === 'email') {
      const emailOTP = generateOTP();
      await storeOTP(emailOTP, 'email');
      
      const emailMessage = `${emailOTP}.`;
      await sendEmail(emailMessage); // Send email with OTP
      message += 'Email ';
    }

    
    return NextResponse.json(
      { message: `OTP sent successfully via ${message.trim()}.` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while sending the OTP. Please try again later.' },
      { status: 500 }
    );
  }
}