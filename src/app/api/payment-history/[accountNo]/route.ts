import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';

export async function GET(
  req: Request,
  { params }: { params: { accountNo: string } }
) {
  try {
    await dbConnect();
    const { accountNo } = params;

    // Get the search params for date filtering if needed
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = { accountNo };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const payments = await Payment
      .find(query)
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Error fetching payment history' },
      { status: 500 }
    );
  }
}