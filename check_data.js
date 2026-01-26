import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const LoanPaymentSchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
});
const LoanPayment = mongoose.models.LoanPayment || mongoose.model("LoanPayment", LoanPaymentSchema);

const LoanSchema = new mongoose.Schema({
    accountNo: String,
    nameEnglish: String,
});
const Loan = mongoose.models.Loan || mongoose.model("Loan", LoanSchema);

async function checkData() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check Loans for Account 1 and 10
        const loans = await Loan.find({ accountNo: { $in: ['1', '10'] } });
        console.log('\nLoans found:', loans.length);
        loans.forEach(l => console.log(`- ${l.accountNo}: ${l._id} (${l.nameEnglish})`));

        // 2. Check LoanPayments for these loans
        const loanIds = loans.map(l => l._id);
        const payments = await LoanPayment.find({ loanId: { $in: loanIds } }).sort({ date: -1 });

        console.log('\nLoanPayments found:', payments.length);
        payments.forEach(p => {
            console.log(`- LoanId: ${p.loanId}, Date: ${p.date.toISOString().split('T')[0]}, Amount: ${p.amount}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
