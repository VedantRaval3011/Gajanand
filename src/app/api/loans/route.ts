import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LoanSchema from '@/models/LoanSchema';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    const existingLoan = await LoanSchema.findOne({ accountNo: data.accountNo });
    if (existingLoan) {
      return NextResponse.json(
        { message: 'Loan with this account number already exists' },
        { status: 400 }
      );
    }

    const loan = await LoanSchema.create(data);
    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { message: 'Error creating loan', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    const loan = await LoanSchema.findOneAndUpdate(
      { accountNo: data.accountNo },
      data,
      { new: true, runValidators: true }
    );
    
    if (!loan) {
      return NextResponse.json(
        { message: 'Loan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { message: 'Error updating loan', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}