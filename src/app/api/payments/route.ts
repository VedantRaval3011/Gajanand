import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { deleteAllPaymentsForAccount, deleteAllPaymentsForDate } from '@/lib/deletePayments';
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
      // Sum in the DB instead of pulling every payment doc into the function and reducing in JS.
      const [{ total = 0 } = {}] = await Payment.aggregate([
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]);
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
            // One payment per account per day: older saves re-inserted history rows
            // for every row on screen, so keep only the latest entry for each day.
            { $sort: { _id: -1 } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Kolkata' },
                },
                amountPaid: { $first: '$amountPaid' },
              },
            },
            {
              $group: {
                _id: null,
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
// Sync saved payments to LoanDoc / LoanPayment / SyncLog in a fixed number of
// round trips (3 reads/writes for the whole batch, not ~5 per payment).
// ---------------------------------------------------------------------------
type SavedPaymentRef = { _id: unknown; accountNo: string };

async function syncPayments(
  payments: (PaymentData & { paymentTime?: string })[],
  savedPayments: SavedPaymentRef[],
  paymentDate: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<void> {
  const savedIdByAccount = new Map(savedPayments.map((sp) => [sp.accountNo, sp._id]));
  // Without a saved payment id, match the log by account + day instead of an
  // undefined paymentId (which Mongoose would drop, matching any log).
  const syncLogFilter = (accountNo: string) => {
    const paymentId = savedIdByAccount.get(accountNo);
    return paymentId
      ? { paymentId }
      : { accountNo, paymentDate: { $gte: startOfDay, $lte: endOfDay } };
  };

  try {
    const accountNos = [...new Set(payments.map((p) => p.accountNo))];
    const loanDocs = await LoanDoc.find(
      { accountNo: { $in: accountNos } },
      { _id: 1, accountNo: 1 }
    ).lean<{ _id: mongoose.Types.ObjectId; accountNo: string }[]>();
    const loanDocByAccount = new Map(loanDocs.map((l) => [l.accountNo, l]));

    const existingLoanPayments = loanDocs.length
      ? await LoanPayment.find(
          { loanId: { $in: loanDocs.map((l) => l._id) }, date: { $gte: startOfDay, $lte: endOfDay } },
          { _id: 1, loanId: 1 }
        ).lean<{ _id: mongoose.Types.ObjectId; loanId: mongoose.Types.ObjectId }[]>()
      : [];
    const existingByLoanId = new Map(existingLoanPayments.map((lp) => [String(lp.loanId), lp._id]));

    const loanPaymentOps: Parameters<typeof LoanPayment.bulkWrite>[0] = [];
    const syncLogOps: Parameters<typeof SyncLog.bulkWrite>[0] = [];

    for (const payment of payments) {
      const loanDoc = loanDocByAccount.get(payment.accountNo);
      const paymentId = savedIdByAccount.get(payment.accountNo);

      if (!loanDoc) {
        syncLogOps.push({
          updateOne: {
            filter: syncLogFilter(payment.accountNo),
            update: {
              $set: {
                paymentId,
                accountNo: payment.accountNo,
                paymentDate,
                amountPaid: payment.amountPaid,
                syncStatus: 'not_found',
                syncError: 'No matching loan found in Excel Creator (LoanDoc)',
              },
            },
            upsert: true,
          },
        });
        continue;
      }

      let loanPaymentId = existingByLoanId.get(String(loanDoc._id));
      if (loanPaymentId) {
        loanPaymentOps.push({
          updateOne: { filter: { _id: loanPaymentId }, update: { $set: { amount: payment.amountPaid } } },
        });
      } else {
        loanPaymentId = new mongoose.Types.ObjectId();
        existingByLoanId.set(String(loanDoc._id), loanPaymentId);
        loanPaymentOps.push({
          insertOne: {
            document: {
              _id: loanPaymentId,
              loanId: loanDoc._id,
              accountNo: payment.accountNo,
              amount: payment.amountPaid,
              date: paymentDate,
            },
          },
        });
      }

      syncLogOps.push({
        updateOne: {
          filter: syncLogFilter(payment.accountNo),
          update: {
            $set: {
              paymentId,
              accountNo: payment.accountNo,
              paymentDate,
              amountPaid: payment.amountPaid,
              loanDocId: loanDoc._id,
              loanPaymentId,
              syncStatus: 'success',
              verifiedAt: new Date(),
              verifiedBy: 'system',
            },
            $unset: { syncError: '' },
          },
          upsert: true,
        },
      });
    }

    if (loanPaymentOps.length) await LoanPayment.bulkWrite(loanPaymentOps, { ordered: false });
    if (syncLogOps.length) await SyncLog.bulkWrite(syncLogOps, { ordered: false });
  } catch (syncError) {
    console.error('[payments] Sync to loan payments failed', syncError);
    try {
      await SyncLog.bulkWrite(
        payments.map((payment) => ({
          updateOne: {
            filter: syncLogFilter(payment.accountNo),
            update: {
              $set: {
                paymentId: savedIdByAccount.get(payment.accountNo),
                accountNo: payment.accountNo,
                paymentDate,
                amountPaid: payment.amountPaid,
                syncStatus: 'failed',
                syncError: String(syncError),
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
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

    // --- 1. Batch upsert Payment documents ---
    const bulkOps = payments.map((payment: PaymentData & { paymentTime?: string }) => ({
      updateOne: {
        filter: payment._id ? { _id: payment._id } : { accountNo: payment.accountNo, paymentDate },
        update: {
          $set: {
            loanId,
            accountNo: payment.accountNo,
            amountPaid: payment.amountPaid,
            paymentDate,
            lateAmount: payment.lateAmount,
            paymentTime: payment.paymentTime,
          }
        },
        upsert: true,
      },
    }));

    await Payment.bulkWrite(bulkOps, { ordered: false });

    const startOfDay = new Date(new Date(paymentDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(paymentDate).setHours(23, 59, 59, 999));
    const accountNos = payments.map((p: PaymentData) => p.accountNo);

    // Fetch the saved payments for response
    const savedPayments = await Payment.find({
      accountNo: { $in: accountNos },
      paymentDate: { $gte: startOfDay, $lte: endOfDay },
    }).lean<(SavedPaymentRef & Record<string, unknown>)[]>();

    // --- 2. Replace (not append) PaymentHistory for these account-days ---
    // Every save sends all rows on screen; inserting each time duplicated the history
    // and inflated "total received". One payment per account per day, so drop that
    // day's rows for these accounts and write them fresh. Exact date match: every
    // save for a day sends the same "YYYY-MM-DD" value.
    await PaymentHistory.deleteMany({
      accountNo: { $in: accountNos },
      date: new Date(paymentDate),
    });
    const historyDocs = payments.map((payment: PaymentData & { paymentTime?: string }) => ({
      accountNo: payment.accountNo,
      date: paymentDate,
      amountPaid: payment.amountPaid,
      lateAmount: payment.lateAmount,
      remainingAmount: payment.remainingAmount,
      paymentTime: payment.paymentTime,
    }));
    await PaymentHistory.insertMany(historyDocs, { ordered: false });

    // --- 3. Sync to loan payments (awaited) ---
    // Awaited: on serverless the function can be frozen right after the response is
    // sent, which silently dropped some syncs and left "Payment Today" empty.
    await syncPayments(payments, savedPayments, paymentDate, startOfDay, endOfDay);

    return NextResponse.json({
      message: 'Payments saved successfully',
      payments: savedPayments, // already plain objects via .lean()
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
    const date = searchParams.get('date');

    // Delete all payments for a specific date
    if (date) {
      const deletedCount = await deleteAllPaymentsForDate(date);
      return NextResponse.json(
        { message: `Successfully deleted ${deletedCount} payment records for date: ${date}` },
        { status: 200 }
      );
    }

    if (!accountNo) {
      return NextResponse.json(
        { error: 'accountNo or date is required' },
        { status: 400 }
      );
    }

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
