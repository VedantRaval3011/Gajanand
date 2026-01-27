import { Schema, model, models, Document } from 'mongoose';

export interface ISyncLog extends Document {
    paymentId: Schema.Types.ObjectId;
    accountNo: string;
    paymentDate: Date;
    amountPaid: number;
    loanDocId?: Schema.Types.ObjectId;
    loanPaymentId?: Schema.Types.ObjectId;
    syncStatus: 'success' | 'failed' | 'pending' | 'not_found' | 'mismatch';
    syncError?: string;
    systemAmount?: number;
    verifiedAt?: Date;
    verifiedBy?: string;
    createdAt: Date;
}

const SyncLogSchema = new Schema(
    {
        paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
        accountNo: { type: String, required: true },
        paymentDate: { type: Date, required: true },
        amountPaid: { type: Number, required: true },
        loanDocId: { type: Schema.Types.ObjectId, ref: 'LoanDoc' }, // null if not found
        loanPaymentId: { type: Schema.Types.ObjectId, ref: 'LoanPayment' },
        syncStatus: {
            type: String,
            enum: ['success', 'failed', 'pending', 'not_found', 'mismatch'],
            default: 'pending',
        },
        syncError: { type: String }, // Error message if failed
        systemAmount: { type: Number }, // Amount found in system if different
        verifiedAt: { type: Date }, // When manually verified
        verifiedBy: { type: String }, // Who verified
    },
    { timestamps: true }
);

export default models.SyncLog || model<ISyncLog>('SyncLog', SyncLogSchema);
