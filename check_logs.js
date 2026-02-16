import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

async function checkLogs() {
    if (!process.env.MONGODB_URI) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await mongoose.connection.collection('synclogs').countDocuments();
        console.log(`Total SyncLogs: ${count}`);
    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}

checkLogs();
