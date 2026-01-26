import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

// Define minimal schemas
const SyncLogSchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
});
const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);

const PaymentSchema = new mongoose.Schema({
    // Minimal schema
});
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

async function cleanupLogs() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all existing payment IDs
        const payments = await Payment.find({}, '_id');
        const paymentIds = payments.map(p => p._id.toString());
        console.log(`Found ${paymentIds.length} existing payments.`);

        // Delete logs where paymentId is NOT in the list of existing payments
        const result = await SyncLog.deleteMany({
            paymentId: { $nin: paymentIds }
        });

        console.log(`Deleted ${result.deletedCount} orphaned sync logs.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupLogs();
