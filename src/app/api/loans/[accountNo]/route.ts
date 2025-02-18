import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LoanSchema from '@/models/LoanSchema';

export async function GET(
  req: Request,
  { params }: { params: { accountNo: string } }
) {
  try {
    await dbConnect();
    
    // Await params to ensure it's resolved before accessing accountNo
    const { accountNo } = await params;
    const loan = await LoanSchema.findOne({ accountNo });
    if (!loan) {
      return NextResponse.json(
        { message: 'Loan not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error fetching loan:', error);
    return NextResponse.json(
      {
        message: 'Error fetching loan',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
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
    
    // Await params to ensure it's resolved before accessing accountNo
    const { accountNo } = await params;
    const loan = await LoanSchema.findOneAndDelete({ accountNo });
    if (!loan) {
      return NextResponse.json(
        { message: 'Loan not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json(
      {
        message: 'Error deleting loan',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}