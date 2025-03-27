import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Note from "@/models/Note";
import connectToDatabase from "@/lib/dbConnect";

// DELETE: Delete a note by ID
export async function DELETE(request: Request, context: { params: Promise<{ noteId: string }> }) {
  try {
    await connectToDatabase();
    const { noteId } = await context.params; // Await the params object

    if (!noteId || !mongoose.isValidObjectId(noteId)) {
      return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    const result = await Note.findByIdAndDelete(noteId);
    if (!result) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}