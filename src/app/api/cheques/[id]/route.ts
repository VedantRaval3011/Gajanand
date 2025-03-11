import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/dbConnect';
import Cheque from '@/models/Cheque';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Extract `id` from URL
    const id = request.nextUrl.pathname.split('/').pop(); 
    if (!id) {
      return NextResponse.json({ error: 'Missing cheque ID' }, { status: 400 });
    }

    const cheque = await Cheque.findById(id);
    if (!cheque) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
    }

    return NextResponse.json(cheque);
  } catch (error) {
    console.error('Error fetching cheque:', error);
    return NextResponse.json({ error: 'Failed to fetch cheque' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Extract `id` from URL
    const id = request.nextUrl.pathname.split('/').pop(); 
    if (!id) {
      return NextResponse.json({ error: 'Missing cheque ID' }, { status: 400 });
    }

    const chequeData = await request.json();
    const updatedCheque = await Cheque.findByIdAndUpdate(id, { $set: chequeData }, { new: true, runValidators: true });

    if (!updatedCheque) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCheque);
  } catch (error) {
    console.error('Error updating cheque:', error);
    return NextResponse.json({ error: 'Failed to update cheque' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Extract `id` from URL
    const id = request.nextUrl.pathname.split('/').pop(); 
    if (!id) {
      return NextResponse.json({ error: 'Missing cheque ID' }, { status: 400 });
    }

    const deletedCheque = await Cheque.findByIdAndDelete(id);
    if (!deletedCheque) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cheque deleted successfully' });
  } catch (error) {
    console.error('Error deleting cheque:', error);
    return NextResponse.json({ error: 'Failed to delete cheque' }, { status: 500 });
  }
}
