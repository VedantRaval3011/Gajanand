import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

// We need to define the schema locally since we're running a script
const SyncLogSchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    accountNo: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    amountPaid: { type: Number, required: true },
    loanDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanDoc' },
    loanPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanPayment' },
    syncStatus: { type: String },
    syncError: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// Use a unique name to avoid OverwriteModelError if it runs multiple times in same context (unlikely here but good practice)
const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);

async function checkLogs() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const logs = await SyncLog.find().sort({ createdAt: -1 }).limit(10);
        console.log('Latest 10 Sync Logs:');
        logs.forEach(log => {
            console.log('---------------------------------------------------');
            console.log(`Date: ${log.createdAt}`);
            console.log(`Account: ${log.accountNo}`);
            console.log(`Amount: ${log.amountPaid}`);
            console.log(`Payment Date: ${log.paymentDate}`);
            console.log(`Status: ${log.syncStatus}`);
            if (log.syncError) console.log(`Error: ${log.syncError}`);
        });

        if (logs.length === 0) {
            console.log('No sync logs found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkLogs();
