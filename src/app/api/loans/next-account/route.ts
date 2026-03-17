import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LoanSchema from '@/models/LoanSchema';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all account numbers (projection + lean for speed)
    const loans = await LoanSchema.find({}, { accountNo: 1, _id: 0 }).lean();
    
    if (!loans.length) {
      return NextResponse.json({ nextAccountNo: '1' });
    }

    // Convert to integers, sort numerically, and scan for first gap: O(n log n) time, O(n) memory.
    const accountNumbers = loans
      .map((loan: any) => Number.parseInt(String(loan.accountNo), 10))
      .filter((n: number) => Number.isFinite(n) && n > 0)
      .sort((a: number, b: number) => a - b);

    let nextNumber = 1;
    for (const n of accountNumbers) {
      if (n === nextNumber) {
        nextNumber++;
        continue;
      }
      if (n > nextNumber) break;
      // If n < nextNumber, keep scanning (duplicates or malformed data)
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