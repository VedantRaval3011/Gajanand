import { NextResponse } from "next/server";
import Note from "@/models/Note";
import connectToDatabase from "@/lib/dbConnect";

// POST: Create or Update a note
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { date, category, loanType, content } = await request.json();

    if (!date || !category || !loanType || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if a note already exists for this date, category, and loanType
    const existingNote = await Note.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      category,
      loanType,
    });

    if (existingNote) {
      // Update the existing note
      existingNote.content = content;
      existingNote.createdAt = new Date();
      await existingNote.save();
      return NextResponse.json(
        { message: "Note updated successfully", note: existingNote },
        { status: 200 }
      );
    } else {
      // Create a new note
      const note = new Note({
        date: new Date(date),
        category,
        loanType,
        content,
      });
      await note.save();
      return NextResponse.json(
        { message: "Note created successfully", note },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating or updating note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch notes based on date, category, and loanType
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const category = searchParams.get("category");
    const loanType = searchParams.get("loanType");

    const query: { 
      date?: { $gte: Date; $lte: Date }; 
      category?: string; 
      loanType?: string; 
    } = {};
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (category) query.category = category;
    if (loanType) query.loanType = loanType;

    const notes = await Note.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}