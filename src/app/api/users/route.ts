import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Holder from '@/models/Holders';

interface User {
  holderName: string;
  name: string;
  fileNumber: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body: User = await request.json();


    if (!body.holderName || !body.name || !body.fileNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: holderName, name, and fileNumber are required' },
        { status: 400 }
      );
    }

    const user = await Holder.create({
      holderName: body.holderName,
      name: body.name,
      fileNumber: body.fileNumber,
      notes: body.notes || '', // Ensure notes is included, default to empty string
    });

  

    return NextResponse.json(
      { success: true, data: user },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function GET() {
  await dbConnect();
  try {
    const users = await Holder.find({});
    return NextResponse.json(
      { success: true, data: users },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}