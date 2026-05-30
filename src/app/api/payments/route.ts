import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { deleteAllPaymentsForAccount } from '@/lib/deletePayments';
import { Payment } from '@/models/Payment';
import { PaymentHistory } from '@/models/Payment';
import LoanSchema from '@/models/LoanSchema';
// Static imports — moved from dynamic imports inside POST handler to avoid
// per-request module resolution overhead.
import LoanDoc from '@/models/Loan';
import LoanPayment from '@/models/PaymentDoc';
import SyncLog from '@/models/SyncLog';

interface PaymentData {
  _id?: string;
  loanId: string;
  accountNo: string;
  amountPaid: number;
  paymentDate: Date;
  lateAmount?: number;
  remainingAmount?: number;
}

// GET handler
export async function GET(request: NextRequest) {
  const requestId =
    request.headers.get('x-request-id') ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const startTotalMs = Date.now();

  const startDbMs = Date.now();
  await dbConnect();
  const dbMs = Date.now() - startDbMs;
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const totalReceivedAmount = searchParams.get('totalReceivedAmount'); // New query parameter
    const totalPerAccount = searchParams.get('totalPerAccount'); // New query parameter for total per account

    // Fetch total received amount (sum of all payments)
    if (totalReceivedAmount === 'true') {
      const payments = await Payment.find({}, { amountPaid: 1, _id: 0 }); // Only fetch the `amountPaid` field
      const total = payments.reduce((sum, payment) => sum + payment.amountPaid, 0); // Calculate total received amount
      const res = NextResponse.json({ totalReceivedAmount: total });
      res.headers.set('x-request-id', requestId);
      res.headers.set(
        'server-timing',
        `db;dur=${dbMs},total;dur=${Date.now() - startTotalMs}`
      );
      return res;
    }

    // Fetch total payments per account
    if (totalPerAccount === 'true') {
      const payments = await Payment.aggregate([
        {
          $group: {
            _id: '$accountNo', // Group by accountNo
            totalPaid: { $sum: '$amountPaid' } // Sum up the amountPaid for each account
          }
        },
        {
          $project: {
            _id: 0, // Exclude _id from the output
            accountNo: '$_id', // Rename _id to accountNo
            totalPaid: 1 // Include totalPaid in the output
          }
        }
      ]);
      const res = NextResponse.json({ payments });
      res.headers.set('x-request-id', requestId);
      res.headers.set(
        'server-timing',
        `db;dur=${dbMs},total;dur=${Date.now() - startTotalMs}`
      );
      return res;
    }

    if (!date) {
      const res = NextResponse.json({ message: 'Date is required' }, { status: 400 });
      res.headers.set('x-request-id', requestId);
      res.headers.set(
        'server-timing',
        `db;dur=${dbMs},total;dur=${Date.now() - startTotalMs}`
      );
      return res;
    }

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    const startQueryMs = Date.now();

    const enhancedPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      // Sort as early as possible (stable display order)
      { $sort: { paymentDate: 1, _id: 1 } },
      // Join loan details by accountNo
      {
        $lookup: {
          from: 'loans',
          localField: 'accountNo',
          foreignField: 'accountNo',
          as: 'loan',
        },
      },
      { $unwind: { path: '$loan', preserveNullAndEmptyArrays: true } },
      // Join aggregated total received from PaymentHistory up to endOfDay
      {
        $lookup: {
          from: 'paymenthistories',
          let: { acc: '$accountNo' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$accountNo', '$$acc'] },
                    { $lte: ['$date', endOfDay] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$accountNo',
                totalReceived: { $sum: '$amountPaid' },
              },
            },
          ],
          as: 'historyAgg',
        },
      },
      {
        $addFields: {
          totalReceived: {
            $ifNull: [{ $first: '$historyAgg.totalReceived' }, 0],
          },
        },
      },
      // Compute lateAmount using the same rules as the client
      {
        $addFields: {
          lateAmount: {
            $cond: [
              { $or: [{ $not: ['$loan'] }, { $not: ['$loan.instAmount'] }] },
              0,
              {
                $let: {
                  vars: {
                    selectedDate: selectedDate,
                    loanDate: '$loan.date',
                    instAmount: '$loan.instAmount',
                    isDaily: '$loan.isDaily',
                    totalReceived: '$totalReceived',
                  },
                  in: {
                    $let: {
                      vars: {
                        expected: {
                          $cond: [
                            '$$isDaily',
                            {
                              $multiply: [
                                {
                                  $max: [
                                    0,
                                    {
                                      $add: [
                                        {
                                          $dateDiff: {
                                            startDate: '$$loanDate',
                                            endDate: '$$selectedDate',
                                            unit: 'day',
                                          },
                                        },
                                        1,
                                      ],
                                    },
                                  ],
                                },
                                '$$instAmount',
                              ],
                            },
                            {
                              $multiply: [
                                {
                                  $max: [
                                    0,
                                    {
                                      $add: [
                                        {
                                          $dateDiff: {
                                            startDate: '$$loanDate',
                                            endDate: '$$selectedDate',
                                            unit: 'month',
                                          },
                                        },
                                        {
                                          $cond: [
                                            {
                                              $gte: [
                                                { $dayOfMonth: '$$selectedDate' },
                                                { $dayOfMonth: '$$loanDate' },
                                              ],
                                            },
                                            1,
                                            0,
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                '$$instAmount',
                              ],
                            },
                          ],
                        },
                      },
                      in: { $subtract: ['$$expected', '$$totalReceived'] },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        $project: {
          historyAgg: 0,
          // Keep loan projection tight: only what the Collection Book needs
          'loan.guarantors': 0,
          'loan.__v': 0,
        },
      },
    ]);

    const queryMs = Date.now() - startQueryMs;

    const res = NextResponse.json({ payments: enhancedPayments });
    res.headers.set('x-request-id', requestId);
    res.headers.set(
      'server-timing',
      `db;dur=${dbMs},query;dur=${queryMs},total;dur=${Date.now() - startTotalMs}`
    );
    return res;
  } catch (error) {
    const res = NextResponse.json(
      { message: 'Error fetching payments', error: String(error) },
      { status: 500 }
    );
    res.headers.set('x-request-id', requestId);
    res.headers.set(
      'server-timing',
      `db;dur=${dbMs},total;dur=${Date.now() - startTotalMs}`
    );
    return res;
  }
}

// ---------------------------------------------------------------------------
// Background sync helper — fire-and-forget, does NOT block the POST response.
// Writes to LoanDoc / LoanPayment / SyncLog after the primary payment is saved.
// ---------------------------------------------------------------------------
async function syncPaymentBackground(
  payment: PaymentData & { paymentTime?: string },
  savedPaymentId: unknown,
  paymentDate: string
): Promise<void> {
  try {
    const loanDoc = await LoanDoc.findOne({ accountNo: payment.accountNo });

    if (loanDoc) {
      const paymentDateObj = new Date(paymentDate);
      const startOfDay = new Date(paymentDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(paymentDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const existingLoanPayment = await LoanPayment.findOne({
        loanId: loanDoc._id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      let loanPaymentId;
      if (existingLoanPayment) {
        existingLoanPayment.amount = payment.amountPaid;
        await existingLoanPayment.save();
        loanPaymentId = existingLoanPayment._id;
      } else {
        const newLoanPayment = await LoanPayment.create({
          loanId: loanDoc._id,
          accountNo: payment.accountNo,
          amount: payment.amountPaid,
          date: paymentDate,
        });
        loanPaymentId = newLoanPayment._id;
      }

      await SyncLog.findOneAndUpdate(
        { paymentId: savedPaymentId },
        {
          accountNo: payment.accountNo,
          paymentDate,
          amountPaid: payment.amountPaid,
          loanDocId: loanDoc._id,
          loanPaymentId,
          syncStatus: 'success',
          verifiedAt: new Date(),
          verifiedBy: 'system',
        },
        { upsert: true, new: true }
      );
    } else {
      await SyncLog.findOneAndUpdate(
        { paymentId: savedPaymentId },
        {
          accountNo: payment.accountNo,
          paymentDate,
          amountPaid: payment.amountPaid,
          syncStatus: 'not_found',
          syncError: 'No matching loan found in Excel Creator (LoanDoc)',
        },
        { upsert: true, new: true }
      );
    }
  } catch (syncError) {
    console.error('[payments] Background sync failed for', payment.accountNo, syncError);
    try {
      await SyncLog.findOneAndUpdate(
        { paymentId: savedPaymentId },
        {
          accountNo: payment.accountNo,
          paymentDate,
          amountPaid: payment.amountPaid,
          syncStatus: 'failed',
          syncError: String(syncError),
        },
        { upsert: true, new: true }
      );
    } catch (logErr) {
      console.error('[payments] SyncLog write also failed:', logErr);
    }
  }
}

// POST handler
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json();
    const { loanId, paymentDate, payments } = body;
    if (!paymentDate || !payments || !Array.isArray(payments)) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    // --- 1. Upsert Payment documents (parallel) ---
    const savedPayments = await Promise.all(
      payments.map(async (payment: PaymentData & { paymentTime?: string }) => {
        if (payment._id) {
          return Payment.findByIdAndUpdate(
            payment._id,
            {
              loanId,
              accountNo: payment.accountNo,
              amountPaid: payment.amountPaid,
              paymentDate,
              lateAmount: payment.lateAmount,
              paymentTime: payment.paymentTime,
            },
            { new: true }
          );
        }
        return Payment.create({
          loanId,
          accountNo: payment.accountNo,
          amountPaid: payment.amountPaid,
          paymentDate,
          lateAmount: payment.lateAmount,
          paymentTime: payment.paymentTime,
        });
      })
    );

    // --- 2. Batch-insert PaymentHistory (1 write instead of N) ---
    const historyDocs = payments.map((payment: PaymentData & { paymentTime?: string }) => ({
      accountNo: payment.accountNo,
      date: paymentDate,
      amountPaid: payment.amountPaid,
      lateAmount: payment.lateAmount,
      remainingAmount: payment.remainingAmount,
      paymentTime: payment.paymentTime,
    }));
    await PaymentHistory.insertMany(historyDocs, { ordered: false });

    // --- 3. Kick off sync as fire-and-forget — does NOT block response ---
    payments.forEach((payment: PaymentData & { paymentTime?: string }, i: number) => {
      const savedId = savedPayments[i]?._id;
      syncPaymentBackground(payment, savedId, paymentDate).catch((err) =>
        console.error('[payments] Unexpected sync error:', err)
      );
    });

    return NextResponse.json({
      message: 'Payments saved successfully',
      payments: savedPayments.map((p) => p.toObject()),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error saving payments', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE handler
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const searchParams = request.nextUrl.searchParams;
    const accountNo = searchParams.get('accountNo');

    if (!accountNo) {
      return NextResponse.json(
        { error: 'accountNo is required' },
        { status: 400 }
      );
    }

    // Delete all payment records for the given accountNo across collections
    const existingCount = await Payment.countDocuments({ accountNo });

    if (existingCount === 0) {
      return NextResponse.json(
        { message: `No payment history found for accountNo: ${accountNo}` },
        { status: 404 }
      );
    }

    await deleteAllPaymentsForAccount(accountNo);

    return NextResponse.json(
      { message: `Successfully deleted ${existingCount} payment records for accountNo: ${accountNo}` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting payment history:', error);
    return NextResponse.json(
      { error: 'Error deleting payment history' },
      { status: 500 }
    );
  }
}
