// components/DataGrid.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';

// Types
interface Payment {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paidDate?: Date;
  lateAmount: number;
}

// Calculate late fee based on days overdue
const calculateLateFee = (payment: Omit<Payment, 'lateAmount'>): number => {
  if (payment.isPaid) {
    // If paid, calculate based on paid date
    const daysLate = differenceInDays(payment.paidDate!, payment.dueDate);
    return daysLate > 0 ? payment.amount * 0.05 * Math.min(daysLate / 30, 3) : 0;
  } else {
    // If not paid, calculate based on current date
    const daysLate = differenceInDays(new Date(), payment.dueDate);
    return daysLate > 0 ? payment.amount * 0.05 * Math.min(daysLate / 30, 3) : 0;
  }
};

export default function DataGrid() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPayment, setNewPayment] = useState<Omit<Payment, 'id' | 'lateAmount'>>({
    description: '',
    amount: 0,
    dueDate: new Date(),
    isPaid: false,
  });

  // Recalculate late fees whenever data changes
  useEffect(() => {
    const timer = setInterval(() => {
      setPayments(prevPayments => 
        prevPayments.map(payment => ({
          ...payment,
          lateAmount: calculateLateFee(payment)
        }))
      );
    }, 86400000); // Update daily
    
    // Immediate calculation
    setPayments(prevPayments => 
      prevPayments.map(payment => ({
        ...payment,
        lateAmount: calculateLateFee(payment)
      }))
    );
    
    return () => clearInterval(timer);
  }, [payments.length]);

  // Add new payment
  const handleAddPayment = () => {
    const payment: Payment = {
      id: Date.now().toString(),
      ...newPayment,
      lateAmount: 0 // Will be calculated by effect
    };
    
    setPayments([...payments, payment]);
    setNewPayment({
      description: '',
      amount: 0,
      dueDate: new Date(),
      isPaid: false
    });
  };

  // Toggle payment status
  const togglePaymentStatus = (id: string) => {
    setPayments(
      payments.map(payment => {
        if (payment.id === id) {
          const updatedPayment = {
            ...payment,
            isPaid: !payment.isPaid,
            paidDate: !payment.isPaid ? new Date() : undefined
          };
          return {
            ...updatedPayment,
            lateAmount: calculateLateFee(updatedPayment)
          };
        }
        return payment;
      })
    );
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Payment Tracker</h1>
      
      {/* Form for adding new payments */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-xl mb-2">Add New Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input
              type="text"
              value={newPayment.description}
              onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount</label>
            <input
              type="number"
              value={newPayment.amount}
              onChange={(e) => setNewPayment({...newPayment, amount: Number(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Due Date</label>
            <input
              type="date"
              value={newPayment.dueDate.toISOString().split('T')[0]}
              onChange={(e) => setNewPayment({...newPayment, dueDate: new Date(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleAddPayment}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Add Payment
            </button>
          </div>
        </div>
      </div>
      
      {/* Data grid */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-left">Amount</th>
              <th className="border p-2 text-left">Due Date</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Paid Date</th>
              <th className="border p-2 text-left">Late Fee</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="border p-2 text-center">No payments added yet</td>
              </tr>
            ) : (
              payments.map(payment => (
                <tr key={payment.id}>
                  <td className="border p-2">{payment.description}</td>
                  <td className="border p-2">${payment.amount.toFixed(2)}</td>
                  <td className="border p-2">{formatDate(payment.dueDate)}</td>
                  <td className="border p-2">
                    <span className={payment.isPaid ? "text-green-500" : "text-red-500"}>
                      {payment.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="border p-2">{payment.paidDate ? formatDate(payment.paidDate) : "-"}</td>
                  <td className="border p-2">${payment.lateAmount.toFixed(2)}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => togglePaymentStatus(payment.id)}
                      className={`px-2 py-1 rounded text-white ${
                        payment.isPaid ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {payment.isPaid ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Summary */}
      {payments.length > 0 && (
        <div className="mt-4">
          <p className="font-bold">
            Total Late Fees: ${payments.reduce((sum, payment) => sum + payment.lateAmount, 0).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}