import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/models/Payment";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Extract query parameters for year and month
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Both year and month are required' },
        { status: 400 }
      );
    }

    // Construct the start and end dates for the given month and year
    const startDate = new Date(Number(year), Number(month) - 1, 1); // First day of the month
    const endDate = new Date(Number(year), Number(month), 0); // Last day of the month

    // Fetch all payments within the specified month and year
    const payments = await Payment.find({
      paymentDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Group payments by accountNo
    const groupedPayments = payments.reduce<Record<string, typeof payments>>((acc, payment) => {
      const { accountNo } = payment;
      if (!acc[accountNo]) {
        acc[accountNo] = [];
      }
      acc[accountNo].push(payment);
      return acc;
    }, {});

    // Transform the grouped data into the desired format, including totalAmountPaid
    const result = Object.keys(groupedPayments).map((accountNo) => {
      const paymentsForAccount = groupedPayments[accountNo];
      const totalAmountPaid = paymentsForAccount.reduce((sum, payment) => {
        return sum + (payment.amount || 0); // Ensure amount exists to avoid NaN
      }, 0);

      return {
        accountNo,
        payments: paymentsForAccount,
        totalAmountPaid, // Add the total amount paid for this account
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching payments by month and year:', error);
    return NextResponse.json(
      { error: 'Error fetching payments by month and year' },
      { status: 500 }
    );
  }
}