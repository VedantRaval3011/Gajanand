import crypto from 'crypto';
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  otp: String,
  type: String, 
  createdAt: { type: Date, expires: 600 } // OTP expires in 10 minutes
});

const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const storeOTP = async (otp: string, type: 'email' ) => {
  await OTP.deleteMany({ type }); // Remove existing OTPs of the same type
  await OTP.create({ otp, type, createdAt: new Date() });
};

export const verifyOTPs = async (emailOTP: string) => {
  const emailOTPDoc = await OTP.findOne({ otp: emailOTP, type: 'email' });
  
  if (!emailOTPDoc ) return false;
  
  // Delete both OTPs after verification
  await OTP.deleteMany({ 
    $or: [
      { otp: emailOTP, type: 'email' },
    ]
  });
  
  return true;
};
