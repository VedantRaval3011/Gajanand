import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Loan from "@/models/Loan";
import LoanPayment from "@/models/PaymentDoc";
import {
  computeOverdueRow,
  summarizeOverdue,
  OverdueLoanInput,
  OverdueRow,
} from "@/lib/overdue";

interface LoanLean extends Omit<OverdueLoanInput, "_id" | "loanType"> {
  _id: { toString(): string };
  loanType: "daily" | "monthly" | "pending";
}

interface PaymentLean {
  loanId: { toString(): string };
  date: Date;
  amount: number;
}

/**
 * GET /api/overdue?date=YYYY-MM-DD
 *
 * Returns every daily/monthly loan with unpaid installments that fell due
 * before `date` (default: today), plus aggregate totals. `pending` loans are
 * excluded — they have no installment schedule.
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const dateParam = request.nextUrl.searchParams.get("date");
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }
    const asOf = dateParam || new Date().toISOString().split("T")[0];

    const [loans, payments] = await Promise.all([
      Loan.find({ loanType: { $in: ["daily", "monthly"] } })
        .select(
          "accountNo nameEnglish nameGujarati installmentAmount lateAmount receivedDate fileCategory loanType"
        )
        .lean<LoanLean[]>(),
      LoanPayment.find({ date: { $lte: new Date(`${asOf}T23:59:59.999Z`) } })
        .select("loanId date amount")
        .lean<PaymentLean[]>(),
    ]);

    const paymentsByLoan = new Map<string, { date: string; amount: number }[]>();
    for (const p of payments) {
      const key = p.loanId.toString();
      const list = paymentsByLoan.get(key) ?? [];
      list.push({ date: new Date(p.date).toISOString().split("T")[0], amount: p.amount });
      paymentsByLoan.set(key, list);
    }

    const rows: OverdueRow[] = [];
    for (const loan of loans) {
      if (loan.loanType === "pending") continue;
      const id = loan._id.toString();
      const row = computeOverdueRow(
        { ...loan, _id: id, loanType: loan.loanType },
        paymentsByLoan.get(id) ?? [],
        asOf
      );
      if (row) rows.push(row);
    }

    rows.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return NextResponse.json({
      asOf,
      summary: summarizeOverdue(rows),
      rows,
      categories: Array.from(new Set(loans.map((l) => l.fileCategory))).sort(),
    });
  } catch (error) {
    console.error("Error computing overdue loans:", error);
    return NextResponse.json(
      { error: "Failed to compute overdue loans" },
      { status: 500 }
    );
  }
}
