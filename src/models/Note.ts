import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  loanType: {
    type: String,
    enum: ["daily", "monthly", "pending"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add a unique index on date, category, and loanType
NoteSchema.index({ date: 1, category: 1, loanType: 1 }, { unique: true });

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);