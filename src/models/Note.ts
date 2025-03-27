import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  
  date: {
    type: Date,
    required: true,
    default: Date.now,
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

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);