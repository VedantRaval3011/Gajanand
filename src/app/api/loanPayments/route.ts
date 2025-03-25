// pages/api/loanPayments.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Schema, model, models } from "mongoose";

const LoanPaymentSchema = new Schema({
  loanId: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
});

const LoanPayment = models.LoanPayment || model("LoanPayment", LoanPaymentSchema);

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const searchParams = request.nextUrl.searchParams;
    const loanId = searchParams.get("loanId");
    const date = searchParams.get("date");
    const exactDate = searchParams.get("exactDate") === "true";

    const query: { loanId?: string; date?: { $gte: Date; $lte: Date } | { $lte: Date } } = {};
    if (loanId) query.loanId = loanId;

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = exactDate ? { $gte: startDate, $lte: endDate } : { $lte: endDate };
    }

    const payments = await LoanPayment.find(query);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const data = await request.json();
    const { loanId, amount, date } = data;

    if (!loanId || !amount || !date) {
      return NextResponse.json({ error: "loanId, amount, and date are required" }, { status: 400 });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if a payment already exists for this loan on this date
    const existingPayment = await LoanPayment.findOne({
      loanId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingPayment) {
      // Update the existing payment
      existingPayment.amount = amount;
      await existingPayment.save();
      console.log(`Updated payment for loan ${loanId} on ${date}: ₹${amount}`);
      return NextResponse.json({ payment: existingPayment });
    } else {
      // Create a new payment
      const payment = new LoanPayment({
        loanId,
        amount,
        date,
      });
      await payment.save();
      console.log(`Created new payment for loan ${loanId} on ${date}: ₹${amount}`);
      return NextResponse.json({ payment });
    }
  } catch (error) {
    console.error("Error creating/updating payment:", error);
    return NextResponse.json({ error: "Failed to create/update payment" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const { pathname } = request.nextUrl;
    const id = pathname.split("/").pop();
    const data = await request.json();

    const payment = await LoanPayment.findByIdAndUpdate(
      id,
      { amount: data.amount },
      { new: true }
    );

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    console.log(`Updated payment ${id}: ₹${data.amount}`);
    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { loanId, date } = await request.json();

    if (!loanId || !date) {
      return NextResponse.json({ error: "loanId and date are required" }, { status: 400 });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const deleteResult = await LoanPayment.deleteOne({
      loanId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "No payment found for the specified date" }, { status: 404 });
    }

    console.log(`Deleted payment for loan ${loanId} on ${date}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}