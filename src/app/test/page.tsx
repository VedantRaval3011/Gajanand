"use client";
import React, { useState, useEffect } from "react";

interface Account {
  _id: string;
  accountNo: string;
  holderName: string;
  mAmount: number;
  instAmount: number;
  isDaily: boolean;
  date: string;
}

interface AccountDetail {
  lateAmount: number;
  receivedAmount: number;
  remainingAmount: number;
}

const AccountSummaryTable = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountDetails, setAccountDetails] = useState<
    Record<string, AccountDetail>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const fetchAllAccounts = async () => {
    try {
      const accountsResponse = await fetch("/api/loans?allAccounts=true");
      const accountsData = await accountsResponse.json();
      setAccounts(accountsData);

      // Fetch payment details for each account
      const details: Record<string, AccountDetail> = {};
      for (const account of accountsData) {
        const paymentHistory = await fetchPaymentHistory(account.accountNo);
        const lateAmount = calculateLateAmount(account, paymentHistory);
        const receivedAmount = calculateReceivedAmount(paymentHistory);
        const remainingAmount = account.mAmount - receivedAmount;

        details[account.accountNo] = {
          lateAmount,
          receivedAmount,
          remainingAmount,
        };
      }
      setAccountDetails(details);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setLoading(false);
    }
  };

  interface PaymentHistoryResponse {
    amountPaid: number;
    // Add other properties from the API response if needed
  }

  const fetchPaymentHistory = async (
    accountNo: string
  ): Promise<PaymentHistoryResponse[]> => {
    try {
      const response = await fetch(`/api/payment-history/${accountNo}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching payment history:", error);
      return [];
    }
  };

  interface PaymentHistoryItem {
    amountPaid: number;
  }

  interface LoanAccount {
    date: string;
    isDaily: boolean;
    instAmount: number;
  }

  const calculateLateAmount = (
    account: LoanAccount,
    paymentHistory: PaymentHistoryItem[]
  ): number => {
    const today = new Date();
    const loanDate = new Date(account.date);
    const totalReceived = calculateReceivedAmount(paymentHistory);

    let expectedPayments = 0;
    if (account.isDaily) {
      const daysDiff = Math.floor(
        (today.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expectedPayments = Math.max(0, (daysDiff + 1) * account.instAmount);
    } else {
      const monthsDiff =
        (today.getFullYear() - loanDate.getFullYear()) * 12 +
        (today.getMonth() - loanDate.getMonth());
      const dayInMonth = today.getDate() >= loanDate.getDate() ? 1 : 0;
      expectedPayments = Math.max(
        0,
        (monthsDiff + dayInMonth) * account.instAmount
      );
    }

    return Math.max(0, expectedPayments - totalReceived);
  };

  interface Payment {
    amountPaid: number;
  }

  const calculateReceivedAmount = (paymentHistory: Payment[]): number => {
    return paymentHistory.reduce(
      (sum, payment) => sum + (payment.amountPaid || 0),
      0
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading account details...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Account Summary</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Account No
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Holder Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Total Amount
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Received Amount
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Late Amount
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Amount to be Paid
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Period Type
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                Installment
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const details = accountDetails[account.accountNo] || {};
              return (
                <tr key={account._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border text-sm">
                    {account.accountNo}
                  </td>
                  <td className="px-4 py-3 border text-sm">
                    {account.holderName}
                  </td>
                  <td className="px-4 py-3 border text-sm">
                    ₹{account.mAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border text-sm">
                    ₹{details.receivedAmount?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 border text-sm text-red-600">
                    ₹{details.lateAmount?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 border text-sm text-blue-600">
                    ₹{details.remainingAmount?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 border text-sm">
                    {account.isDaily ? "Daily" : "Monthly"}
                  </td>
                  <td className="px-4 py-3 border text-sm">
                    ₹{account.instAmount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountSummaryTable;
