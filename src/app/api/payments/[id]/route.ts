import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';
import mongoose from 'mongoose';

interface PaymentData {
  _id?: string;
  loanId: string;
  accountNo: string;
  amountPaid: number;
  paymentDate: Date; 
  lateAmount?: number;
}

// GET handler
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Date is required' }, { status: 400 });
    }

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const payments = await Payment.find({
      paymentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('GET Error:', error);
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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const savedPayments = await Promise.all(
        payments.map(async (payment: PaymentData) => {
          const paymentData = {
            loanId: new mongoose.Types.ObjectId(loanId),
            accountNo: payment.accountNo,
            amountPaid: payment.amountPaid,
            paymentDate: new Date(paymentDate),
            lateAmount: payment.lateAmount || 0
          };

          if (payment._id) {
            return await Payment.findByIdAndUpdate(
              payment._id,
              paymentData,
              { new: true, session }
            );
          } else {
            return await Payment.create([paymentData], { session });
          }
        })
      );

      await session.commitTransaction();
      
      return NextResponse.json({
        message: 'Payments saved successfully',
        payments: savedPayments.flat() // Flatten because create returns an array
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { message: 'Error saving payments', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE handler
export async function DELETE(request: NextRequest) {
  await dbConnect();
  
  try {
    const path = request.nextUrl.pathname;
    const id = path.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { message: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }

    await Payment.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'Payment deleted successfully' }
    );
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { message: 'Error deleting payment', error: String(error) },
      { status: 500 }
    );
  }
}