// pages/api/loansDoc/assignIndex.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Loan from "@/models/Loan";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { accountNo, index } = await request.json();

    if (!accountNo || index === undefined || index < 1 || index > 84) {
      return NextResponse.json({ error: "Invalid accountNo or index (must be 1-84)" }, { status: 400 });
    }

    // Find the loan by accountNo
    const loan = await Loan.findOne({ accountNo });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Check if another loan already has this index
    const existingLoanAtIndex = await Loan.findOne({ index });
    if (existingLoanAtIndex && existingLoanAtIndex.accountNo !== accountNo) {
      // Move the existing loan back to unassigned (-1)
      await Loan.updateOne({ _id: existingLoanAtIndex._id }, { $set: { index: -1 } });
    }

    // Assign the new index to the loan
    await Loan.updateOne({ _id: loan._id }, { $set: { index } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning index:", error);
    return NextResponse.json({ error: "Failed to assign index" }, { status: 500 });
  }
}