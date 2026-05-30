import { Payment, PaymentHistory } from '@/models/Payment';
import Loan from '@/models/Loan';
import LoanPayment from '@/models/PaymentDoc';
import SyncLog from '@/models/SyncLog';

function getDayRange(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

export async function deletePaymentRecord(payment: {
  _id: string;
  accountNo: string;
  paymentDate: Date;
  amountPaid: number;
}) {
  const { startOfDay, endOfDay } = getDayRange(new Date(payment.paymentDate));

  await SyncLog.deleteMany({
    $or: [
      { paymentId: payment._id },
      { paymentIds: payment._id },
      {
        accountNo: payment.accountNo,
        paymentDate: { $gte: startOfDay, $lte: endOfDay },
      },
    ],
  });

  const loanDoc = await Loan.findOne({ accountNo: payment.accountNo });
  if (loanDoc) {
    await LoanPayment.findOneAndDelete({
      loanId: loanDoc._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
  }

  await PaymentHistory.deleteOne({
    accountNo: payment.accountNo,
    date: { $gte: startOfDay, $lte: endOfDay },
    amountPaid: payment.amountPaid,
  });

  await Payment.findByIdAndDelete(payment._id);
}

export async function deleteAllPaymentsForAccount(accountNo: string) {
  await Payment.deleteMany({ accountNo });
  await PaymentHistory.deleteMany({ accountNo });
  await SyncLog.deleteMany({ accountNo });

  const loanDoc = await Loan.findOne({ accountNo });
  if (loanDoc) {
    await LoanPayment.deleteMany({ loanId: loanDoc._id });
  }
}
