import { Schema, model, models, Document } from 'mongoose';

export interface PaymentDocument extends Document {
  loanId: Schema.Types.ObjectId;
  accountNo: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
    },
    accountNo: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Saving a collection looks up the day's entry by loanId + date; overdue and
// ledger views filter by accountNo / date.
PaymentSchema.index({ loanId: 1, date: 1 });
PaymentSchema.index({ accountNo: 1 });

export default models.LoanPayment || model('LoanPayment', PaymentSchema);