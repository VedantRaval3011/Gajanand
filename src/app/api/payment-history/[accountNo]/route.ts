import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';

export async function GET(
  req: Request,
  { params }: { params: { accountNo: string } }
) {
  try {
    await dbConnect();
    const { accountNo } = await params; // Await params here

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

export async function DELETE(
  req: Request,
  { params }: { params: { accountNo: string } }
) {
  try {
    await dbConnect();
    const { accountNo } = await params; // Await params here

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