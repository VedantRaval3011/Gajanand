import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

// Define minimal schemas
const SyncLogSchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: false }, // paymentId might be optional in some contexts, but let's assume strict for now
}, { timestamps: true });
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

        // 1. Orphan Removal (Previous Logic)
        const payments = await Payment.find({}, '_id');
        const paymentIds = new Set(payments.map(p => p._id.toString()));
        console.log(`Found ${paymentIds.size} existing payments.`);

        const allSyncLogs = await SyncLog.find({});
        console.log(`Found ${allSyncLogs.length} total sync logs.`);

        const logsToDelete = [];
        const duplicatesToDelete = [];

        // Group by paymentId to find duplicates
        const logsByPaymentId = {};

        for (const log of allSyncLogs) {
            // Check for orphan
            if (log.paymentId && !paymentIds.has(log.paymentId.toString())) {
                logsToDelete.push(log._id);
            } else if (log.paymentId) {
                // Check for duplicates
                const pid = log.paymentId.toString();
                if (!logsByPaymentId[pid]) {
                    logsByPaymentId[pid] = [];
                }
                logsByPaymentId[pid].push(log);
            }
        }

        // Identify duplicates to delete
        for (const pid in logsByPaymentId) {
            const logs = logsByPaymentId[pid];
            if (logs.length > 1) {
                // Sort by updatedAt descending (keep latest)
                // If updatedAt unavailable, use _id (roughly chronological)
                logs.sort((a, b) => {
                    const timeA = new Date(a.updatedAt || 0).getTime();
                    const timeB = new Date(b.updatedAt || 0).getTime();
                    return timeB - timeA;
                });

                // Keep the first one (latest), delete the rest
                for (let i = 1; i < logs.length; i++) {
                    duplicatesToDelete.push(logs[i]._id);
                }
            }
        }

        if (logsToDelete.length > 0) {
            const result = await SyncLog.deleteMany({ _id: { $in: logsToDelete } });
            console.log(`Deleted ${result.deletedCount} orphaned sync logs.`);
        } else {
            console.log('No orphaned sync logs found.');
        }

        if (duplicatesToDelete.length > 0) {
            const result = await SyncLog.deleteMany({ _id: { $in: duplicatesToDelete } });
            console.log(`Deleted ${result.deletedCount} duplicate sync logs.`);
        } else {
            console.log('No duplicate sync logs found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupLogs();
