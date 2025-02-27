import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';

interface PaymentQuery {
  accountNo: { $in: string[] };
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Get the search params for account numbers and date filtering
    const { searchParams } = new URL(req.url);
    const accountNos = searchParams.get('accountNos')?.split(',') || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: PaymentQuery = { accountNo: { $in: accountNos } };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Fetch payment histories for the given account numbers
    const payments = await Payment
      .find(query)
      .sort({ date: -1 })
      .lean();

    // Group payments by account number
    const groupedPayments = payments.reduce((acc, payment) => {
      if (!acc[payment.accountNo]) {
        acc[payment.accountNo] = [];
      }
      acc[payment.accountNo].push(payment);
      return acc;
    }, {} as Record<string, typeof payments>);

    return NextResponse.json(groupedPayments);
  } catch (error) {
    console.error('Error fetching batch payment history:', error);
    return NextResponse.json(
      { error: 'Error fetching batch payment history' },
      { status: 500 }
    );
  }
}