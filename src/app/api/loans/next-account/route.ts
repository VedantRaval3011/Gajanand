import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LoanSchema from '@/models/LoanSchema';

export async function GET() {
  try {
    await dbConnect();
    
    // Find the loan with the highest account number
    const lastLoan = await LoanSchema.findOne().sort({ accountNo: -1 });
    
    // If no loans exist, start with account number 1
    if (!lastLoan) {
      return NextResponse.json({ nextAccountNo: '1' });
    }

    // Increment the last account number
    const nextAccountNo = (parseInt(lastLoan.accountNo) + 1).toString();
    
    return NextResponse.json({ nextAccountNo });
  } catch (error) {
    console.error('Error getting next account number:', error);
    return NextResponse.json(
      { message: 'Error getting next account number', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}