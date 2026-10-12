// pages/api/loanPayments/deleteAll.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import LoanPayment from "@/models/PaymentDoc";
import { loanPaymentsFilter } from "@/lib/loanPaymentMatch";

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { loanId } = await request.json();

    if (!loanId) {
      return NextResponse.json({ error: "loanId is required" }, { status: 400 });
    }

    // Delete every payment shown for this loan (same matching as the payment history display)
    const deleteResult = await LoanPayment.deleteMany(await loanPaymentsFilter(loanId));

    console.log(`Deleted ${deleteResult.deletedCount} payments for loan ${loanId}`);

    // Nothing left to delete is not an error - the history is already empty
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
