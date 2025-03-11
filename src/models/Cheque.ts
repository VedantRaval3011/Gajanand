import mongoose, { Schema } from 'mongoose';

const chequeSchema = new Schema({
  userName: { type: String},
  bankName: { type: String},
  notes: { type: String},

}, { timestamps: true });

export default mongoose.models.Cheque || mongoose.model('Cheque', chequeSchema);