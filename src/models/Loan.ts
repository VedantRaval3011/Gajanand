import { Schema, model, models, Document } from "mongoose";

export interface LoanDocument extends Document {
  accountNo: string;
  nameGujarati: string;
  nameEnglish: string;
  installmentAmount: number;
  receivedAmount: number;
  lateAmount: number;
  receivedDate: Date;
  paymentReceivedToday: number;
  loanType: "daily" | "monthly"| "pending";
  fileCategory: string;
  order: number; // Added for reordering
  createdAt: Date;
  updatedAt: Date;
  index: number;
  totalToBePaid: number;
}

const LoanSchema = new Schema(
  {
    accountNo: { type: String, required: true, unique: true, trim: true },
    nameGujarati: { type: String, required: true, trim: true },
    nameEnglish: { type: String, required: true, trim: true },
    installmentAmount: { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, default: 0, min: 0 },
    lateAmount: { type: Number, default: 0, min: 0 },
    receivedDate: { type: Date, default: Date.now },
    paymentReceivedToday: { type: Number, default: 0, min: 0 },
    loanType: { type: String, enum: ["daily", "monthly","pending"], required: true },
    totalToBePaid: {
      type: Number,
      required: function(this: LoanDocument) { return this.loanType === 'pending'; },
      default: function(this: LoanDocument) { return this.loanType === 'pending' ? 1000 : undefined; }
    },
    fileCategory: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 }, // New field for sorting
    index: { type: Number, default: -1 }
  },
  { timestamps: true }
);

export default models.LoanDoc || model("LoanDoc", LoanSchema);