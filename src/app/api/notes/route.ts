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

    // Set date to the start of the day
    const noteDate = new Date(date);
    noteDate.setHours(0, 0, 0, 0);

    // Check for an existing note with the exact date, category, and loanType
    const existingNote = await Note.findOne({
      date: noteDate,
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
        date: noteDate,
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
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: "A note for this date, category, and loan type already exists." },
        { status: 400 }
      );
    }
    console.error("Error creating or updating note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch notes based on date, fileCategory, and loanType
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const category = searchParams.get("category");
    const loanType = searchParams.get("loanType");

    interface NoteQuery {
      date?: Date;
      category?: string;
      loanType?: string;
    }

    const query: NoteQuery = {};
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      query.date = queryDate;
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