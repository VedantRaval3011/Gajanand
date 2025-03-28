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
  Search,
  Wallet,
} from "lucide-react";
import AccountFinder from "@/components/accountFinder/AccountFinder";
import { useNavigationStore } from "@/store/NavigationStore";
import Image from "next/image";

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
  date?: string;
}

interface AccountDetails {
  [accountNo: string]: AccountDetail;
}

interface PaymentHistories {
  [accountNo: string]: PaymentHistory[];
}

const LoanDetailsRange = () => {
  const [fromAccountNo, setFromAccountNo] = useState("");
  const [toAccountNo, setToAccountNo] = useState("");
  const [loans, setLoans] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accountDetails, setAccountDetails] = useState<AccountDetails>({});
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );

  const fromAccountNoRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [selectedAccountNo, setSelectedAccountNo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentHistories, setPaymentHistories] = useState<PaymentHistories>(
    {}
  );

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
        setSelectedNavItem("Report", 5);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, setSelectedNavItem]);

  // Calculate totals when loans or accountDetails change
  useEffect(() => {
    if (loans.length > 0) {
      calculateTotals(loans, accountDetails);
    }
  }, [loans, accountDetails]);

  // Optimized calculation of totals
  const calculateTotals = (loans: Account[], details: AccountDetails) => {
    const newTotals = loans.reduce(
      (acc, loan) => {
        const detail = details[loan.accountNo] || {
          lateAmount: 0,
          receivedAmount: 0,
          remainingAmount: 0,
        };
        const lateAmount = Math.max(detail.lateAmount || 0, 0);

        // Calculate monthly and daily installments separately
        const monthlyInstAmount = loan.isDaily ? 0 : loan.instAmount || 0;
        const dailyInstAmount = loan.isDaily ? loan.instAmount || 0 : 0;

        return {
          totalAmount: acc.totalAmount + (loan.amount || 0),
          totalMaturityAmount: acc.totalMaturityAmount + (loan.mAmount || 0),
          totalReceivedAmount:
            acc.totalReceivedAmount + (detail.receivedAmount || 0),
          totalRemainingAmount:
            acc.totalRemainingAmount + (detail.remainingAmount || 0),
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
  };

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

   // Theme management effect
   useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      setIsDarkMode(savedTheme === "dark");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  // Theme toggle function
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return newMode;
    });
  };

  // Keyboard shortcut for theme toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault(); // Prevent default browser behavior
        toggleDarkMode();   // Trigger theme toggle
      }
    };
    
    // Add listener to window with capture phase to ensure it catches the event
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []); 

  useEffect(() => {
    // Focus on the first field by default
    if (fromAccountNoRef.current) {
      fromAccountNoRef.current.focus();
    }
  }, []);

  // Optimized loan details fetching
  // Modify your fetchLoanDetails function like this:
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

      let filteredLoans: Account[] = allAccounts.filter(
        (loan: Account): boolean =>
          parseInt(loan.accountNo) >= parseInt(fromAccountNo) &&
          parseInt(loan.accountNo) <= parseInt(toAccountNo)
      );

      // Sort loans by accountNo in ascending order
      filteredLoans = filteredLoans.sort(
        (a, b) => parseInt(a.accountNo) - parseInt(b.accountNo)
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

  // New optimized function to fetch payment histories in batches
  const fetchBatchPaymentHistories = async (accountNos: string[]) => {
    try {
      const response = await fetch(
        `/api/payment-histories?accountNos=${accountNos.join(",")}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch batch payment histories");
      }
      const data = await response.json();
      setPaymentHistories(data);
      return data;
    } catch (error) {
      console.error("Error fetching batch payment histories:", error);
      throw error;
    }
  };

  // Optimized function to calculate received amount
  const calculateReceivedAmount = (
    paymentHistory: PaymentHistory[]
  ): number => {
    if (!paymentHistory || !Array.isArray(paymentHistory)) {
      return 0;
    }
    return paymentHistory.reduce(
      (sum, payment) => sum + (payment.amountPaid || 0),
      0
    );
  };

  // Optimized function to calculate late amount
  const calculateLateAmount = (
    account: Account,
    paymentHistory: PaymentHistory[]
  ): number => {
    const today = new Date();
    const loanDate = new Date(account.date);
    const totalReceived = calculateReceivedAmount(paymentHistory || []);
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

  // Optimized fetchAllAccounts function
  const fetchAllAccounts = async () => {
    setLoading(true);
    try {
      const accountsResponse = await fetch("/api/loans?allAccounts=true");
      const accountsData = await accountsResponse.json();
      setAccounts(accountsData);

      // Get all account numbers for batch fetching
      const accountNos = accountsData.map(
        (account: Account) => account.accountNo
      );

      // Batch fetch all payment histories at once
      await fetchBatchPaymentHistories(accountNos);

      const histories = await fetchBatchPaymentHistories(accountNos);

      // Once we have all payment histories, calculate all account details
      const details: AccountDetails = {};
      for (const account of accountsData) {
        const history = histories[account.accountNo] || [];
        const receivedAmount = calculateReceivedAmount(history);
        const lateAmount = calculateLateAmount(account, history);
        const remainingAmount = account.mAmount - receivedAmount;

        details[account.accountNo] = {
          lateAmount,
          receivedAmount,
          remainingAmount,
        };
      }

      setAccountDetails(details);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
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
            <div className="flex items-center gap-2">
              {isDarkMode ? (
                <Image
                  src="/GFLogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-12 lg:w-14 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                />
              ) : (
                <Image
                  src="/lightlogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-12 lg:w-14 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                />
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-0 text-orange-500">
                Crediter / Debiter
              </h1>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 p-2.5 bg-orange-500 hover:bg-orange-600 lg:hidden text-white rounded-full transition-colors"
              >
                <Search size={20} />
              </button>
            </div>

            <span className="hidden">
              {accounts.length}
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
                  <p className="hidden">{Object.keys(paymentHistories).length}</p>
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
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 uppercase font-semibold">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      SR No.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acc No.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Loan Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Mat. Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Inst.(M)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Inst.(D)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Holder Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Mat. Amt
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Late Amt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loans.map((loan, index) => {
                    const details = accountDetails[loan.accountNo] || {
                      lateAmount: 0,
                      receivedAmount: 0,
                      remainingAmount: 0,
                    };
                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                          {index + 1}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                          {loan.accountNo}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {new Date(loan.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {new Date(loan.mDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {loan.isDaily
                            ? "-"
                            : loan.instAmount?.toFixed(2) || "-"}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {loan.isDaily
                            ? loan.instAmount?.toFixed(2) || "-"
                            : "-"}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate">
                          {loan.holderName}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {loan.amount?.toFixed(2) || "-"}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                          {loan.mAmount?.toFixed(2) || "-"}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                          {details.receivedAmount?.toFixed(2) || "-"}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-orange-600">
                          {details.remainingAmount?.toFixed(2) || "-"}
                        </td>
                        <td
                          className={`px-3 py-4 whitespace-nowrap text-sm font-medium ${
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
