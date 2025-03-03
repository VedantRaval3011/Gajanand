import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Holders from '@/models/Holders';

export async function GET() {
  await dbConnect();
  try {
    const users = await Holders.find({});
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const user = await Holders.create(body);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}