import mongoose, { Schema, Document } from 'mongoose';

// Guarantor Interface
export interface IGuarantor extends Document {
  holderName: string;
  address: string;
  telephone: string;
  city: string;
}

// Loan Interface
export interface ILoan extends Document {
  accountNo: string;
  loanNo: string;
  date: Date;
  mDate: Date;
  amount: number;
  period: number;
  isDaily: boolean;
  instAmount: number;
  mAmount: number;
  holderName: string;
  holderAddress: string;
  telephone1: string;
  telephone2?: string;
  name: string;
  hasGuarantor: boolean;
  guarantors: IGuarantor[];
  createdAt: Date;
  updatedAt: Date;
}

// Guarantor Schema
const GuarantorSchema = new Schema<IGuarantor>({
  holderName: {
    type: String,
    required: [true, 'Guarantor holder name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Guarantor address is required'],
    trim: true
  },
  telephone: {
    type: String,
    required: [true, 'Guarantor telephone is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Guarantor city is required'],
    trim: true
  },
 
});

// Loan Schema
const LoanSchema = new Schema<ILoan>({
  accountNo: {
    type: String,
    required: [true, 'Account number is required'],
    unique: true,
    trim: true
  },
  loanNo: {
    type: String,
    required: [true, 'Loan number is required'],
    unique: true,
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Loan date is required'],
  },
  mDate: {
    type: Date,
    required: [true, 'Maturity date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  period: {
    type: Number,
    required: [true, 'Loan period is required'],
    min: [1, 'Period must be at least 1 day']
  },
  isDaily: {
    type: Boolean,
    required: true,
    default: true
  },
  instAmount: {
    type: Number,
    required: [true, 'Installment amount is required'],
    min: [0, 'Installment amount cannot be negative']
  },
  mAmount: {
    type: Number,
    required: [true, 'Maturity amount is required'],
    min: [0, 'Maturity amount cannot be negative']
  },
  holderName: {
    type: String,
    required: [true, 'Holder name is required'],
    trim: true
  },
  holderAddress: {
    type: String,
    required: [true, 'Holder address is required'],
    trim: true
  },
  telephone1: {
    type: String,
    required: [true, 'Primary telephone is required'],
    trim: true
  },
  telephone2: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  hasGuarantor: {
    type: Boolean,
    default: false
  },
 
  guarantors: [GuarantorSchema],
  
}, {
  timestamps: true
});




// Export the model
export default mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);