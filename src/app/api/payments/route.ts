import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';
import { PaymentHistory } from '@/models/Payment';
import LoanSchema from '@/models/LoanSchema';

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

// POST handler
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json();
    const { loanId, paymentDate, payments } = body;
    if (!paymentDate || !payments || !Array.isArray(payments)) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    // Dynamic imports to avoid potential circular dependency issues
    const LoanDocModule = await import('@/models/Loan');
    const LoanDoc = LoanDocModule.default;
    const PaymentDocModule = await import('@/models/PaymentDoc');
    const LoanPayment = PaymentDocModule.default;
    const SyncLogModule = await import('@/models/SyncLog');
    const SyncLog = SyncLogModule.default;

    const savedPayments = await Promise.all(
      payments.map(async (payment: PaymentData & { paymentTime?: string }) => { // Extend type to include paymentTime
        let savedPayment;
        if (payment._id) {
          savedPayment = await Payment.findByIdAndUpdate(
            payment._id,
            {
              loanId,
              accountNo: payment.accountNo,
              amountPaid: payment.amountPaid,
              paymentDate,
              lateAmount: payment.lateAmount,
              paymentTime: payment.paymentTime, // Save paymentTime
            },
            { new: true }
          );
        } else {
          savedPayment = await Payment.create({
            loanId,
            accountNo: payment.accountNo,
            amountPaid: payment.amountPaid,
            paymentDate,
            lateAmount: payment.lateAmount,
            paymentTime: payment.paymentTime, // Save paymentTime
          });
        }

        // Update payment history with paymentTime
        await PaymentHistory.create({
          accountNo: payment.accountNo,
          date: paymentDate,
          amountPaid: payment.amountPaid,
          lateAmount: payment.lateAmount,
          remainingAmount: payment.remainingAmount,
          paymentTime: payment.paymentTime, // Include paymentTime
        });

        // --- SYNC LOGIC START ---
        try {
          // 1. Find matching loan in LoanDoc
          const loanDoc = await LoanDoc.findOne({ accountNo: payment.accountNo });

          if (loanDoc) {
            const paymentDateObj = new Date(paymentDate);
            const startOfDay = new Date(paymentDateObj);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(paymentDateObj);
            endOfDay.setHours(23, 59, 59, 999);

            // 2. Check/Create/Update LoanPayment
            const existingLoanPayment = await LoanPayment.findOne({
              loanId: loanDoc._id,
              date: { $gte: startOfDay, $lte: endOfDay }
            });

            let loanPaymentId;

            if (existingLoanPayment) {
              // Update existing payment
              existingLoanPayment.amount = payment.amountPaid;
              await existingLoanPayment.save();
              loanPaymentId = existingLoanPayment._id;
            } else {
              // Create new payment
              const newLoanPayment = await LoanPayment.create({
                loanId: loanDoc._id,
                accountNo: payment.accountNo,
                amount: payment.amountPaid,
                date: paymentDate,
              });
              loanPaymentId = newLoanPayment._id;
            }

            // 3. Log Success
            await SyncLog.findOneAndUpdate(
              { paymentId: savedPayment._id },
              {
                accountNo: payment.accountNo,
                paymentDate: paymentDate,
                amountPaid: payment.amountPaid,
                loanDocId: loanDoc._id,
                loanPaymentId: loanPaymentId,
                syncStatus: 'success',
                verifiedAt: new Date(), // Auto-verify on successful sync
                verifiedBy: 'system'
              },
              { upsert: true, new: true }
            );
          } else {
            // Log Not Found
            await SyncLog.findOneAndUpdate(
              { paymentId: savedPayment._id },
              {
                accountNo: payment.accountNo,
                paymentDate: paymentDate,
                amountPaid: payment.amountPaid,
                syncStatus: 'not_found',
                syncError: 'No matching loan found in Excel Creator (LoanDoc)',
              },
              { upsert: true, new: true }
            );
          }
        } catch (syncError) {
          console.error('Error syncing to LoanPayment:', syncError);
          // Log Failure
          await SyncLog.findOneAndUpdate(
            { paymentId: savedPayment._id },
            {
              accountNo: payment.accountNo,
              paymentDate: paymentDate,
              amountPaid: payment.amountPaid,
              syncStatus: 'failed',
              syncError: String(syncError),
            },
            { upsert: true, new: true }
          );
        }
        // --- SYNC LOGIC END ---

        return savedPayment;
      })
    );

    return NextResponse.json({
      message: 'Payments saved successfully',
      payments: savedPayments.map((p) => p.toObject()), // Ensure all fields (including paymentTime) are returned
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

    // Delete all payment history records for the given accountNo
    const result = await Payment.deleteMany({ accountNo });

    if (result.deletedCount > 0) {
      return NextResponse.json(
        { message: `Successfully deleted ${result.deletedCount} payment history records for accountNo: ${accountNo}` },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: `No payment history found for accountNo: ${accountNo}` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting payment history:', error);
    return NextResponse.json(
      { error: 'Error deleting payment history' },
      { status: 500 }
    );
  }
}
