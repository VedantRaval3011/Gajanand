import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function getGujaratiDay(date: Date): string {
  const days = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
  return days[date.getDay()];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Add calendar months while keeping the same day-of-month as `base` (clamped to month length). */
export function addMonthsKeepingDay(base: Date, months: number): Date {
  const day = base.getDate();
  const result = new Date(base);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();
  result.setDate(Math.min(day, lastDayOfMonth));
  return result;
}

/** 1-based installment index; installment 1 is due on receivedDate. */
export function getMonthlyInstallmentDueDate(
  receivedDate: Date,
  installmentIndex: number
): Date {
  return addMonthsKeepingDay(receivedDate, installmentIndex - 1);
}

export function calculateMonthsSinceStart(
  startDate: Date | string,
  currentDate: Date | string
): number {
  const start = new Date(startDate);
  const current = new Date(currentDate);
  start.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  let months = 0;
  let installmentIndex = 1;
  while (
    getMonthlyInstallmentDueDate(start, installmentIndex) <= current
  ) {
    months++;
    installmentIndex++;
  }
  return months;
}

export function getMonthlyNextDueAndCovered(
  receivedDate: Date,
  monthsSinceStart: number,
  totalPaid: number,
  installmentAmount: number
): { nextDueDate: Date; coveredUntilDate: Date } {
  const installmentsFullyPaid = Math.floor(totalPaid / installmentAmount);
  const totalDue = installmentAmount * monthsSinceStart;
  const remaining = totalDue - totalPaid;

  let nextInstallmentNumber: number;
  if (remaining > 0) {
    nextInstallmentNumber = installmentsFullyPaid + 1;
  } else {
    const extraMonths =
      remaining < 0
        ? Math.floor(Math.abs(remaining) / installmentAmount)
        : 0;
    nextInstallmentNumber = monthsSinceStart + 1 + extraMonths;
  }

  const coveredInstallmentNumber = Math.max(installmentsFullyPaid, 1);
  return {
    nextDueDate: getMonthlyInstallmentDueDate(
      receivedDate,
      nextInstallmentNumber
    ),
    coveredUntilDate: getMonthlyInstallmentDueDate(
      receivedDate,
      coveredInstallmentNumber
    ),
  };
}

/**
 * Monthly loans: late fee after the installment due date, using the collection
 * (selected) date — not today's system date. `lateFeePerDay` is the loan's per-day rate.
 */
export function getMonthlyCalendarLateFee(
  selectedDate: Date,
  installmentDueDate: Date,
  lateFeePerDay: number
): { daysLate: number; calendarLateFee: number } {
  const selected = new Date(selectedDate);
  selected.setHours(0, 0, 0, 0);
  const due = new Date(installmentDueDate);
  due.setHours(0, 0, 0, 0);
  if (selected <= due) {
    return { daysLate: 0, calendarLateFee: 0 };
  }
  const daysLate = Math.floor(
    (selected.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
  const rate = lateFeePerDay || 0;
  return { daysLate, calendarLateFee: daysLate * rate };
}

export function calculatePaymentStatus(
  installmentAmount: number,
  receivedAmount: number,
  lateAmount: number,
  receivedDate: Date
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const receivedDay = new Date(receivedDate);
  receivedDay.setHours(0, 0, 0, 0);

  // Calculate days difference
  const diffTime = receivedDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    // Paid in advance
    return formatDate(receivedDate);
  } else if (diffDays === 0) {
    // Paid today
    return `${formatCurrency(0)} (No dues today)`;
  } else {
    // Late payment
    return `${formatCurrency(lateAmount)} Late`;
  }
}

export function updateLoanStatus(
  installmentAmount: number,
  currentReceivedAmount: number,
  paymentAmount: number,
  currentDate: Date
): {
  newReceivedAmount: number;
  newReceivedDate: Date;
  newLateAmount: number;
} {
  // Calculate new received amount
  const newReceivedAmount = currentReceivedAmount + paymentAmount;

  // Calculate days covered by payment
  const daysCovered = Math.floor(newReceivedAmount / installmentAmount);

  // Calculate new received date
  const newReceivedDate = new Date(currentDate);
  newReceivedDate.setDate(currentDate.getDate() + daysCovered);

  // Calculate late amount
  let newLateAmount = 0;
  if (newReceivedAmount < installmentAmount) {
    newLateAmount = installmentAmount - newReceivedAmount;
  }

  return {
    newReceivedAmount,
    newReceivedDate,
    newLateAmount,
  };
}
