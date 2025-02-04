import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  accountNo: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  lateAmount: { type: Number, default: 0 },
  isDefaultAmount: { type: Boolean, default: false }
});

const PaymentHistorySchema = new mongoose.Schema({
  accountNo: { type: String, required: true },
  date: { type: Date, required: true },
  amountPaid: { type: Number, required: true },
  lateAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true }
});

export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export const PaymentHistory = mongoose.models.PaymentHistory || mongoose.model('PaymentHistory', PaymentHistorySchema);