// models/Holders.ts
import mongoose, { Schema } from 'mongoose';

const holderSchema = new Schema({
  holderName: { type: String, required: true },
  name: { type: String, required: true },
  fileNumber: { type: String, required: true },
  notes: { type: String, default: '' }, // Add notes field
}, { timestamps: true });

export default mongoose.models.Holders || mongoose.model('Holders', holderSchema);