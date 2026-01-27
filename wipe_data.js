import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

// Define minimal schema - strict: false effectively
const SyncLogSchema = new mongoose.Schema({}, { strict: false });
const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);

async function wipe() {
    if (!process.env.MONGODB_URI) {
        console.error("No Mongo URI");
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await SyncLog.deleteMany({});
        console.log(`Deleted ${result.deletedCount} SyncLogs.`);
    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}

wipe();
