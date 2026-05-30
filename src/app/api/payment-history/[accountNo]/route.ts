import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { deleteAllPaymentsForAccount } from '@/lib/deletePayments';
import { Payment } from '@/models/Payment';

interface PaymentQuery {
  accountNo: string;
  paymentDate?: {
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
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment
      .find(query)
      .sort({ paymentDate: -1 })
      .lean();

    // Format the payment timestamp to desired format (e.g., "5:22:26 PM")
    const formattedPayments = payments.map(payment => ({
      ...payment,
      paymentTime: new Date(payment.paymentDate).toLocaleTimeString('en-US', {
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