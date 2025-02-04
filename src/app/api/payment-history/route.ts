import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';

export async function POST(req: Request) {
    try {
      await dbConnect();
      const body = await req.json();
      
      const { accountNo, date, amountPaid, lateAmount, remainingAmount } = body;
      
      // Validate required fields
      if (!accountNo || !date || typeof amountPaid !== 'number') {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
  
      const payment = await Payment.create({
        accountNo,
        date: new Date(date),
        amountPaid,
        lateAmount,
        remainingAmount
      });
  
      return NextResponse.json(payment, { status: 201 });
    } catch (error) {
      console.error('Error creating payment history:', error);
      return NextResponse.json(
        { error: 'Error creating payment history' },
        { status: 500 }
      );
    }
}