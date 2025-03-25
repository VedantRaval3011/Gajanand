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
