import mongoose from "mongoose";

// Extra cash received for a file on a day that isn't tied to a loan row
// (e.g. "Uma tayar 17500"). Shown under the file's payment total.
const ExtraCashSchema = new mongoose.Schema(
  {
    // "YYYY-MM-DD", the same value the payment table's date picker uses, so
    // there is no timezone shifting between save and lookup.
    date: { type: String, required: true },
    loanType: { type: String, enum: ["daily", "monthly", "pending"], required: true },
    category: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

ExtraCashSchema.index({ date: 1, loanType: 1, category: 1 });

export default mongoose.models.ExtraCash || mongoose.model("ExtraCash", ExtraCashSchema);
