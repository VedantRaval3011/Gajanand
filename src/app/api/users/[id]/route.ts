import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Holder from '@/models/Holders';

interface User {
  holderName?: string;
  name?: string;
  fileNumber?: string;
  notes?: string;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const { id } = await params;
    const body: User = await request.json();

    if (!body.holderName && !body.name && !body.fileNumber && body.notes === undefined) {
      return NextResponse.json(
        { success: false, error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    if ((body.holderName !== undefined && !body.holderName) ||
        (body.name !== undefined && !body.name) ||
        (body.fileNumber !== undefined && !body.fileNumber)) {
      return NextResponse.json(
        { success: false, error: 'Required fields cannot be empty' },
        { status: 400 }
      );
    }

    const user = await Holder.findByIdAndUpdate(
      id,
      { $set: body }, // Use $set to update only provided fields
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

  

    return NextResponse.json(
      { success: true, data: user },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
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
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: {} },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}