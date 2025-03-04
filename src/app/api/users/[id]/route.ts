import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Holder from '@/models/Holders';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // Fixed context to proper destructuring
) {
  await dbConnect();
  try {
    const { id } = await params;  // Get the id from params
    const body = await request.json();  // Get the update data from request body
    
    const user = await Holder.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const { id } = await params;
    const user = await Holder.findByIdAndDelete(id);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}