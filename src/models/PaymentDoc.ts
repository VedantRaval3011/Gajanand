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
      required: true,
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

export default models.PaymentDoc || model('PaymentDoc', PaymentSchema);