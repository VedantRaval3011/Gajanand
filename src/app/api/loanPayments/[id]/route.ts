// api/loanPayments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Schema, model, models } from "mongoose";

// Define the schema
const LoanPaymentSchema = new Schema({
  loanId: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
});

// Define the model
const LoanPayment = models.LoanPayment || model("LoanPayment", LoanPaymentSchema);

// Define the params type explicitly
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await dbConnect();
    const resolvedParams = await params; // Resolve the Promise
    const paymentId = resolvedParams.id;
    
    // Delete the specific payment
    const result = await LoanPayment.findByIdAndDelete(paymentId);
    
    if (!result) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await dbConnect();
    const resolvedParams = await params; // Resolve the Promise
    const paymentId = resolvedParams.id;
    const data = await request.json();
    
    // Validate the amount
    if (typeof data.amount !== "number" || data.amount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    
    // Update the payment with the new amount
    const payment = await LoanPayment.findByIdAndUpdate(
      paymentId,
      { amount: data.amount },
      { new: true }
    );
    
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    
    return NextResponse.json({ payment });
  } catch (error: unknown) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}