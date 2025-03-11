import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/dbConnect';
import Cheque from '@/models/Cheque';

// GET all cheques
export async function GET() {
  try {
    await connectToDatabase();
    const cheques = await Cheque.find({}).sort({ createdAt: -1 });
    return NextResponse.json(cheques);
  } catch (error) {
    console.error('Error fetching cheques:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cheques' },
      { status: 500 }
    );
  }
}

// POST a new cheque
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const chequeData = await request.json();

    if (!chequeData) {
      return NextResponse.json(
        { error: 'Cheque data is required' },
        { status: 400 }
      );
    }

    const newCheque = new Cheque(chequeData);
    await newCheque.save();

    return NextResponse.json(newCheque, { status: 201 });
  } catch (error) {
    console.error('Error adding cheque:', error);
    return NextResponse.json(
      { error: 'Failed to add cheque' },
      { status: 500 }
    );
  }
}
