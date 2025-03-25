import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Loan from "@/models/Loan";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { loans: loanIds } = await request.json();

    if (!Array.isArray(loanIds)) {
      return NextResponse.json({ error: "Invalid loan IDs" }, { status: 400 });
    }

    // Update order by updating a custom 'order' field (add to Loan model if needed)
    const updates = loanIds.map((id, index) =>
      Loan.updateOne({ _id: id }, { $set: { order: index } })
    );
    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering loans:", error);
    return NextResponse.json({ error: "Failed to reorder loans" }, { status: 500 });
  }
}