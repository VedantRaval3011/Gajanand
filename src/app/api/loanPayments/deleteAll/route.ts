// pages/api/loanPayments/deleteAll.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Schema, model, models } from "mongoose";

const LoanPaymentSchema = new Schema({
  loanId: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
});

const LoanPayment = models.LoanPayment || model("LoanPayment", LoanPaymentSchema);

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { loanId } = await request.json();

    if (!loanId) {
      return NextResponse.json({ error: "loanId is required" }, { status: 400 });
    }

    // Delete all payments for the specified loan
    const deleteResult = await LoanPayment.deleteMany({
      loanId: loanId,
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: "No payments found for the specified loan" }, 
        { status: 404 }
      );
    }

    console.log(`Deleted ${deleteResult.deletedCount} payments for loan ${loanId}`);
    
    return NextResponse.json({ 
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `Successfully deleted ${deleteResult.deletedCount} payment(s)`
    });
  } catch (error) {
    console.error("Error deleting all payments:", error);
    return NextResponse.json(
      { error: "Failed to delete all payments" }, 
      { status: 500 }
    );
  }
}