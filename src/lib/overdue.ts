import { computePaymentStatus } from "@/lib/paymentStatus";
import {
  getMonthlyCalendarLateFee,
  getMonthlyNextDueAndCovered,
} from "@/lib/utils";

export type OverdueSeverity = "low" | "medium" | "high";

export interface OverdueLoanInput {
  _id: string;
  accountNo: string;
  nameEnglish: string;
  nameGujarati: string;
  installmentAmount: number;
  lateAmount: number;
  receivedDate: string | Date;
  fileCategory: string;
  loanType: "daily" | "monthly";
}

export interface OverdueRow {
  loanId: string;
  accountNo: string;
  nameEnglish: string;
  nameGujarati: string;
  fileCategory: string;
  loanType: "daily" | "monthly";
  installmentAmount: number;
  /** Unpaid principal installments that fell due before `asOf`. */
  amountDue: number;
  /** Monthly loans only: per-day late fee accrued up to `asOf`. */
  lateFee: number;
  /** amountDue + lateFee */
  totalOutstanding: number;
  installmentsBehind: number;
  /** Daily: installments (days) behind. Monthly: days past the first unpaid due date. */
  daysOverdue: number;
  totalDue: number;
  totalPaid: number;
  lastPaymentDate: string | null;
  daysSinceLastPayment: number | null;
  severity: OverdueSeverity;
}

export interface OverdueSummary {
  count: number;
  totalAmountDue: number;
  totalLateFee: number;
  totalOutstanding: number;
  bySeverity: Record<OverdueSeverity, { count: number; amount: number }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` shifted by `days` (calendar arithmetic in UTC, so no DST drift). */
export function shiftDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function severityForDays(days: number): OverdueSeverity {
  if (days > 30) return "high";
  if (days > 7) return "medium";
  return "low";
}

/**
 * Arrears for one loan as of `asOf` (YYYY-MM-DD).
 *
 * Only installments that fell due *before* `asOf` count, so a borrower who
 * simply has not paid yet today is not flagged. Every payment received up to
 * and including `asOf` is netted off. Returns null when nothing is overdue.
 *
 * Due amounts come from `computePaymentStatus`, the same calculation the
 * collection book uses, evaluated as of the previous day.
 */
export function computeOverdueRow(
  loan: OverdueLoanInput,
  payments: { date: string; amount: number }[],
  asOf: string
): OverdueRow | null {
  const installment = loan.installmentAmount;
  if (!(installment > 0)) return null;

  const dueAsOf = shiftDateString(asOf, -1);
  const receivedDate = new Date(loan.receivedDate);
  const receivedIso = receivedDate.toISOString();

  // computePaymentStatus counts payments dated before `dueAsOf` from history
  // plus `paymentReceivedToday` — pass everything dated on/after it as the latter.
  const recentPayments = payments
    .filter((p) => p.date >= dueAsOf)
    .reduce((sum, p) => sum + p.amount, 0);

  const status = computePaymentStatus(
    {
      _id: loan._id,
      accountNo: loan.accountNo,
      nameEnglish: loan.nameEnglish,
      nameGujarati: loan.nameGujarati,
      installmentAmount: installment,
      lateAmount: loan.lateAmount,
      receivedDate: receivedIso,
      paymentReceivedToday: recentPayments,
      receivedAmount: 0,
      fileCategory: loan.fileCategory,
      paymentHistory: payments,
      loanType: loan.loanType,
    },
    dueAsOf,
    loan.loanType
  );

  const d = status.calculationDetails;
  const amountDue = Math.max(d.remainingAfterToday, 0);
  if (amountDue <= 0) return null;

  const installmentsBehind = Math.ceil(amountDue / installment);

  let lateFee = 0;
  let daysOverdue = installmentsBehind;
  if (loan.loanType === "monthly") {
    const received = new Date(receivedDate);
    received.setHours(0, 0, 0, 0);
    const { nextDueDate } = getMonthlyNextDueAndCovered(
      received,
      d.monthsSinceStart ?? 0,
      d.totalPaid,
      installment
    );
    const fee = getMonthlyCalendarLateFee(
      new Date(`${asOf}T00:00:00`),
      nextDueDate,
      loan.lateAmount
    );
    lateFee = fee.calendarLateFee;
    daysOverdue = fee.daysLate;
  }

  const lastPaymentDate = payments.reduce<string | null>(
    (latest, p) => (p.amount > 0 && (!latest || p.date > latest) ? p.date : latest),
    null
  );
  const daysSinceLastPayment = lastPaymentDate
    ? Math.max(
        Math.round(
          (new Date(`${asOf}T00:00:00Z`).getTime() -
            new Date(`${lastPaymentDate}T00:00:00Z`).getTime()) /
            DAY_MS
        ),
        0
      )
    : null;

  return {
    loanId: loan._id,
    accountNo: loan.accountNo,
    nameEnglish: loan.nameEnglish,
    nameGujarati: loan.nameGujarati,
    fileCategory: loan.fileCategory,
    loanType: loan.loanType,
    installmentAmount: installment,
    amountDue,
    lateFee,
    totalOutstanding: amountDue + lateFee,
    installmentsBehind,
    daysOverdue,
    totalDue: d.totalDue,
    totalPaid: d.totalPaid,
    lastPaymentDate,
    daysSinceLastPayment,
    severity: severityForDays(daysOverdue),
  };
}

export function summarizeOverdue(rows: OverdueRow[]): OverdueSummary {
  const summary: OverdueSummary = {
    count: rows.length,
    totalAmountDue: 0,
    totalLateFee: 0,
    totalOutstanding: 0,
    bySeverity: {
      low: { count: 0, amount: 0 },
      medium: { count: 0, amount: 0 },
      high: { count: 0, amount: 0 },
    },
  };
  for (const row of rows) {
    summary.totalAmountDue += row.amountDue;
    summary.totalLateFee += row.lateFee;
    summary.totalOutstanding += row.totalOutstanding;
    summary.bySeverity[row.severity].count += 1;
    summary.bySeverity[row.severity].amount += row.totalOutstanding;
  }
  return summary;
}
