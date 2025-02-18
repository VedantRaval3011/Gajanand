import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';
import { PaymentHistory } from '@/models/Payment';
import LoanSchema from '@/models/LoanSchema';

// GET handler
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const totalReceivedAmount = searchParams.get('totalReceivedAmount'); // New query parameter
    const totalPerAccount = searchParams.get('totalPerAccount'); // New query parameter for total per account

    // Fetch total received amount (sum of all payments)
    if (totalReceivedAmount === 'true') {
      const payments = await Payment.find({}, { amountPaid: 1, _id: 0 }); // Only fetch the `amountPaid` field
      const total = payments.reduce((sum, payment) => sum + payment.amountPaid, 0); // Calculate total received amount
      return NextResponse.json({ totalReceivedAmount: total });
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
      return NextResponse.json({ payments });
    }

    if (!date) {
      return NextResponse.json({ message: 'Date is required' }, { status: 400 });
    }

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    const payments = await Payment.find({
      paymentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: 1 });

    // Fetch additional data for each payment
    const enhancedPayments = await Promise.all(
      payments.map(async (payment) => {
        const loan = await LoanSchema.findOne({ accountNo: payment.accountNo });
        if (!loan) {
          return payment;
        }

        // Calculate late amount
        const loanDate = new Date(loan.loanDate);
        const daysDiff = Math.floor(
          (selectedDate.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get payment history
        const paymentHistory = await PaymentHistory.find({
          accountNo: payment.accountNo,
          date: { $lte: endOfDay }
        });
        const totalReceived = paymentHistory.reduce(
          (sum, hist) => sum + hist.amountPaid,
          0
        );
        const lateAmount = Math.max(0, (daysDiff * loan.instAmount) - totalReceived);

        return {
          ...payment.toObject(),
          lateAmount,
          totalReceived
        };
      })
    );

    return NextResponse.json({ payments: enhancedPayments });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error fetching payments', error: String(error) },
      { status: 500 }
    );
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
    const savedPayments = await Promise.all(
      payments.map(async (payment: any) => {
        // Save or update the payment
        let savedPayment;
        if (payment._id) {
          savedPayment = await Payment.findByIdAndUpdate(
            payment._id,
            {
              loanId,
              accountNo: payment.accountNo,
              amountPaid: payment.amountPaid,
              paymentDate,
              lateAmount: payment.lateAmount
            },
            { new: true }
          );
        } else {
          savedPayment = await Payment.create({
            loanId,
            accountNo: payment.accountNo,
            amountPaid: payment.amountPaid,
            paymentDate,
            lateAmount: payment.lateAmount
          });
        }
        // Update payment history
        await PaymentHistory.create({
          accountNo: payment.accountNo,
          date: paymentDate,
          amountPaid: payment.amountPaid,
          lateAmount: payment.lateAmount,
          remainingAmount: payment.remainingAmount
        });
        return savedPayment;
      })
    );
    return NextResponse.json({
      message: 'Payments saved successfully',
      payments: savedPayments
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error saving payments', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const payment = await Payment.findById(params.id);
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }
    // Delete the payment
    await Payment.findByIdAndDelete(params.id);
    // Delete corresponding payment history
    await PaymentHistory.deleteOne({
      accountNo: payment.accountNo,
      date: payment.paymentDate
    });
    return NextResponse.json(
      { message: 'Payment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Error deleting payment', error: String(error) },
      { status: 500 }
    );
  }
}