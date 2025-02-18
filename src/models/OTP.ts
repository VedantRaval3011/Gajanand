import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms'],
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes
  }
});

export const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);