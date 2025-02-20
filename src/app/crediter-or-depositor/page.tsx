"use client";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import TimeDisplay from "@/ui/TimeDisplay";
import { Ubuntu } from "next/font/google";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Wallet,
} from "lucide-react";
import AccountFinder from "@/components/accountFinder/AccountFinder";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

interface Account {
  _id: string;
  accountNo: string;
  holderName: string;
  amount: number;
  mAmount: number;
  instAmount: number;
  isDaily: boolean;
  date: string;
  mDate: string;
}

interface AccountDetail {
  lateAmount: number;
  receivedAmount: number;
  remainingAmount: number;
}

interface PaymentHistory {
  amountPaid: number;
}

const LoanDetailsRange = () => {
  const [fromAccountNo, setFromAccountNo] = useState("");
  const [toAccountNo, setToAccountNo] = useState("");
  const [loans, setLoans] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accountDetails, setAccountDetails] = useState<
    Record<string, AccountDetail>
  >({});

  const fromAccountNoRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [selectedAccountNo, setSelectedAccountNo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New state for totals
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalMaturityAmount: 0,
    totalReceivedAmount: 0,
    totalRemainingAmount: 0,
    totalInstAmountMonthly: 0,
    totalInstAmountDaily: 0,
    totalLateAmount: 0,
  });

  useEffect(() => {
    fetchAllAccounts();
    // Set focus on fromAccountNo input by default
    if (fromInputRef.current) {
      fromInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate totals when loans or accountDetails change
  useEffect(() => {
    if (loans.length > 0) {
      const newTotals = loans.reduce(
        (acc, loan) => {
          const details = accountDetails[loan.accountNo] || {};
          const lateAmount = Math.max(details.lateAmount || 0, 0);

          // Calculate monthly and daily installments separately
          const monthlyInstAmount = loan.isDaily ? 0 : loan.instAmount || 0;
          const dailyInstAmount = loan.isDaily ? loan.instAmount || 0 : 0;

          return {
            totalAmount: acc.totalAmount + (loan.amount || 0),
            totalMaturityAmount: acc.totalMaturityAmount + (loan.mAmount || 0),
            totalReceivedAmount:
              acc.totalReceivedAmount + (details.receivedAmount || 0),
            totalRemainingAmount:
              acc.totalRemainingAmount + (details.remainingAmount || 0),
            totalInstAmountMonthly:
              acc.totalInstAmountMonthly + monthlyInstAmount,
            totalInstAmountDaily: acc.totalInstAmountDaily + dailyInstAmount,
            totalLateAmount: acc.totalLateAmount + lateAmount,
          };
        },
        {
          totalAmount: 0,
          totalMaturityAmount: 0,
          totalReceivedAmount: 0,
          totalRemainingAmount: 0,
          totalInstAmountMonthly: 0,
          totalInstAmountDaily: 0,
          totalLateAmount: 0,
        }
      );
      setTotals(newTotals);
    }
  }, [loans, accountDetails]);

  // Handle keyboard events
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    inputType: "from" | "to"
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputType === "from" && toInputRef.current) {
        toInputRef.current.focus();
      } else if (inputType === "to") {
        fetchLoanDetails();
        if (fromInputRef.current) {
          fromInputRef.current.focus();
        }
      }
    }
  };

  useEffect(() => {
    const handleThemeToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d" && (e.altKey || e.metaKey)) {
        e.preventDefault();
        setIsDarkMode((prev) => !prev);
        if (document.documentElement.classList.contains("dark")) {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      }
    };
    window.addEventListener("keydown", handleThemeToggle);
    return () => window.removeEventListener("keydown", handleThemeToggle);
  }, []);

  useEffect(() => {
    // Focus on the first field by default
    if (fromAccountNoRef.current) {
      fromAccountNoRef.current.focus();
    }
  }, []);

  // Rest of your existing functions remain the same
  const fetchLoanDetails = async () => {
    if (!fromAccountNo || !toAccountNo) {
      setError("Please provide both 'From Account No.' and 'To Account No.'");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("/api/loans?allAccounts=true");
      const allAccounts = response.data;

      const filteredLoans: Account[] = allAccounts.filter(
        (loan: Account): boolean =>
          parseInt(loan.accountNo) >= parseInt(fromAccountNo) &&
          parseInt(loan.accountNo) <= parseInt(toAccountNo)
      );

      if (filteredLoans.length === 0) {
        setError("No loans found for the given account range.");
      } else {
        setLoans(filteredLoans);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred while fetching loan details.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Your existing helper functions remain the same
  const fetchPaymentHistory = async (accountNo: string) => {
    try {
      const response = await fetch(`/api/payment-history/${accountNo}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching payment history:", error);
      return [];
    }
  };

  const calculateReceivedAmount = (
    paymentHistory: PaymentHistory[]
  ): number => {
    return paymentHistory.reduce(
      (sum, payment) => sum + (payment.amountPaid || 0),
      0
    );
  };

  const calculateLateAmount = (
    account: Account,
    paymentHistory: PaymentHistory[]
  ): number => {
    const today = new Date();
    const loanDate = new Date(account.date);
    const totalReceived = calculateReceivedAmount(paymentHistory);
    let expectedPayments = 0;

    if (account.isDaily) {
      const daysDiff = Math.floor(
        (today.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expectedPayments = (daysDiff + 1) * account.instAmount;
    } else {
      const monthsDiff =
        (today.getFullYear() - loanDate.getFullYear()) * 12 +
        (today.getMonth() - loanDate.getMonth());
      const dayInMonth = today.getDate() >= loanDate.getDate() ? 1 : 0;
      expectedPayments = (monthsDiff + dayInMonth) * account.instAmount;
    }

    return expectedPayments - totalReceived;
  };

  const fetchAllAccounts = async () => {
    try {
      const accountsResponse = await fetch("/api/loans?allAccounts=true");
      const accountsData = await accountsResponse.json();
      setAccounts(accountsData);

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

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-900 min-h-screen ${ubuntu.className} uppercase`}
    >
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden mx-2 sm:mx-4 md:mx-6">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-0 text-orange-500">
              Crediter / Debiter
            </h1>
            <span className="hidden">
              {accounts.length}
              {isDarkMode}
              {selectedAccountNo}
            </span>
            <TimeDisplay></TimeDisplay>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
            <input
              ref={fromInputRef}
              type="number"
              placeholder="From Account No."
              value={fromAccountNo}
              onChange={(e) => setFromAccountNo(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "from")}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base sm:text-lg md:text-xl font-bold"
            />
            <input
              ref={toInputRef}
              type="number"
              placeholder="To Account No."
              value={toAccountNo}
              onChange={(e) => setToAccountNo(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "to")}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base sm:text-lg md:text-xl font-bold"
            />
            <button
              onClick={fetchLoanDetails}
              disabled={loading}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition duration-300 disabled:bg-gray-400 w-full sm:w-auto md:w-96"
            >
              {loading ? "Loading..." : "Fetch Loans"}
            </button>
          </div>

          {error && (
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          )}

          {/* Totals Summary */}
          {loans.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-4 mb-4 sm:mb-6 text-sm">
              {/* Total Finance */}
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/20 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-base sm:text-lg font-semibold text-emerald-800 dark:text-emerald-200 uppercase">
                      Total Finance
                    </h2>
                    <h1 className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl text-emerald-800 font-bold dark:text-emerald-300">
                      {totals.totalAmount.toFixed(2)} ₹
                    </h1>
                  </div>
                  <Wallet className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              {/* Total Maturity Amount */}
              <div className="bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900/20 dark:to-stone-800/20 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg border border-stone-50 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-base sm:text-lg font-semibold text-stone-800 dark:text-stone-200 uppercase">
                      Total Maturity Amount
                    </h2>
                    <h1 className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl text-stone-800 font-bold dark:text-stone-400">
                      {totals.totalMaturityAmount.toFixed(2)} ₹
                    </h1>
                  </div>
                  <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-stone-600 dark:text-stone-400" />
                </div>
              </div>

              {/* Total Received Amount */}
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-base sm:text-lg font-semibold text-yellow-800 dark:text-yellow-200 uppercase">
                      Total Received Amount
                    </h2>
                    <h1 className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl text-yellow-800 font-bold dark:text-yellow-300">
                      {totals.totalReceivedAmount.toFixed(2)} ₹
                    </h1>
                  </div>
                  <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>

              {/* Total Remaining Amount */}
              <div className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-base sm:text-lg font-semibold text-red-800 dark:text-red-200 uppercase">
                      Total Outstanding Amount
                    </h2>
                    <h1 className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl text-red-800 font-bold dark:text-red-300">
                      {totals.totalRemainingAmount.toFixed(2)} ₹
                    </h1>
                  </div>
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Total Inst. Amount */}
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/20 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col w-full">
                    <h2 className="text-base sm:text-lg font-semibold text-indigo-800 dark:text-indigo-200 uppercase">
                      Total Inst. Amount
                    </h2>
                    <div className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg text-indigo-800 font-bold dark:text-indigo-300 flex flex-col sm:flex-row gap-2 sm:gap-6">
                      <span className="text-orange-600">
                        Monthly:{" "}
                        <span className="text-lg sm:text-xl md:text-2xl">
                          {totals.totalInstAmountMonthly.toFixed(2)} ₹
                        </span>
                      </span>
                      <span className="text-orange-600 dark:text-orange-600">
                        Daily:{" "}
                        <span className="text-lg sm:text-xl md:text-2xl">
                          {totals.totalInstAmountDaily.toFixed(2)} ₹
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Late Amount */}
              <div className="bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/20 dark:to-pink-800/20 p-3 sm:p-4 md:p-6 rounded-xl shadow-lg border border-pink-200 dark:border-pink-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-base sm:text-lg font-semibold text-pink-800 dark:text-pink-200 uppercase">
                      Total Late Amount
                    </h2>
                    <h1 className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl font-bold text-pink-800 dark:text-pink-300">
                      {totals.totalLateAmount.toFixed(2)} ₹
                    </h1>
                  </div>
                  <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-pink-600 dark:text-pink-400" />
                </div>
              </div>
            </div>
          )}

          {/* Responsive table */}
          {loans.length > 0 && (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Acc No.
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Loan Date
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Mat. Date
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Inst.(M)
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Inst.(D)
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Holder
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Mat. Amt
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Received
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Outstanding
                        </th>
                        <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Late Amt
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loans.map((loan, index) => {
                        const details = accountDetails[loan.accountNo] || {};
                        return (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {loan.accountNo}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {new Date(loan.date).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {new Date(loan.mDate).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {loan.isDaily
                                ? "-"
                                : loan.instAmount?.toFixed(2) || "-"}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {loan.isDaily
                                ? loan.instAmount?.toFixed(2) || "-"
                                : "-"}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold max-w-[100px] sm:max-w-[150px] truncate">
                              {loan.holderName}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {loan.amount?.toFixed(2) || "-"}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg font-bold">
                              {loan.mAmount?.toFixed(2) || "-"}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-green-600 text-sm sm:text-base md:text-lg font-bold">
                              {details.receivedAmount?.toFixed(2) || "-"}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-orange-600 text-sm sm:text-base md:text-lg font-bold">
                              {details.remainingAmount?.toFixed(2) || "-"}
                            </td>
                            <td
                              className={`px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-sm sm:text-base md:text-lg font-bold ${
                                details.lateAmount < 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {details.lateAmount?.toFixed(2) || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <AccountFinder
        onAccountSelect={(accountNo) => {
          setSelectedAccountNo(accountNo);
          setFromAccountNo(accountNo);
          setTimeout(() => {
            fromInputRef.current?.focus();
          }, 0);
        }}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />
    </div>
  );
};

export default LoanDetailsRange;
