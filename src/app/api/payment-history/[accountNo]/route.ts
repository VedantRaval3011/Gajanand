import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';

interface PaymentQuery {
  accountNo: string;
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ accountNo: string }> }
) {
  try {
    await dbConnect();
    const { accountNo } = await context.params;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: PaymentQuery = { accountNo };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const payments = await Payment
      .find(query)
      .sort({ date: -1 })
      .lean();

    // Format the payment timestamp to desired format (e.g., "5:22:26 PM")
    const formattedPayments = payments.map(payment => ({
      ...payment,
      paymentTime: new Date(payment.date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Error fetching payment history' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ accountNo: string }> }
) {
  try {
    await dbConnect();
    const { accountNo } = await context.params;

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