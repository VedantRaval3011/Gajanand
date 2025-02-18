import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LoanSchema from '@/models/LoanSchema';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all account numbers
    const loans = await LoanSchema.find({}, { accountNo: 1 }).sort({ accountNo: 1 });
    
    if (!loans.length) {
      return NextResponse.json({ nextAccountNo: '1' });
    }

    // Convert account numbers to integers and find first available number
    const accountNumbers = loans.map(loan => parseInt(loan.accountNo));
    let nextNumber = 1;

    while (accountNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    return NextResponse.json({ nextAccountNo: nextNumber.toString() });
  } catch (error) {
    console.error('Error getting next account number:', error);
    return NextResponse.json(
      { message: 'Error getting next account number', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}