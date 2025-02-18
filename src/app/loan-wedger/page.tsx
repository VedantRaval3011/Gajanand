"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Calendar, Home } from "lucide-react";
import { Ubuntu } from "next/font/google";
import Link from "next/link";
import TimeDisplay from "@/ui/TimeDisplay";
import { useRouter } from "next/navigation";

interface LoanDetails {
  accountNo: string;
  loanNo: string;
  date: string;
  mDate: string;
  amount: number;
  period: number;
  isDaily: boolean;
  instAmount: number;
  mAmount: number;
  holderName: string;
  holderAddress: string;
  telephone1: string;
  telephone2: string;
  name: string;
  hasGuarantor: boolean;
  guarantors: Array<{
    holderName: string;
    address: string;
    telephone: string;
    city: string;
    _id: string;
  }>;
}

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

const LoanLedger: React.FC = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loans, setLoans] = useState<LoanDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const fromDateRef = useRef<HTMLInputElement | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const toDateRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleThemeToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d" && (e.altKey || e.metaKey)) {
        e.preventDefault();
        setIsDarkMode((prev) => !prev);
        // Toggle dark class on document
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchLoans = async () => {
    // Prevent duplicate API calls if already loading
    if (loading) return;

    // Check if both fromDate and toDate are provided
    if (!fromDate || !toDate) {
      alert("Please enter both fromDate and toDate.");
      return;
    }

    // Validate fromDate and toDate
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);

    if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
      alert("Invalid date format. Please enter valid dates.");
      return;
    }

    // Reset loans and total amount before fetching new data
    setLoans([]); // Clear existing loans
    setTotalAmount(0); // Reset total amount
    setLoading(true); // Set loading state

    try {
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/loans?fromDate=${fromDate}&toDate=${toDate}&timestamp=${timestamp}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache", // Prevent caching of API response
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch loans");
      }

      const data = await response.json();

      // Log the fetched data for debugging
      console.log(
        "Fetched loans for date range:",
        fromDate,
        "to",
        toDate,
        data
      );

      // Update the loans state with the new data
      setLoans(data);

      // Calculate the total amount for the new loans
      const total = data.reduce(
        (sum: number, loan: LoanDetails) => sum + loan.amount,
        0
      );
      setTotalAmount(total);

      // Reset expanded account to avoid showing old guarantor details
      setExpandedAccount(null);
    } catch (error) {
      toast.error("Error fetching loans: " + (error as Error).message);
    } finally {
      setLoading(false); // Ensure loading state is reset
    }
  };

  useEffect(() => {
    if (fromDate && toDate) {
      fetchLoans();
    }
  }, [fromDate, toDate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.currentTarget.id === "fromDate" && toDateRef.current) {
        toDateRef.current.focus();
      } else if (e.currentTarget.id === "toDate" && fromDate && toDate) {
        fetchLoans();
      }
    }
  };

  const fetchLoanDetails = async (accountNo: string) => {
    try {
      const response = await fetch(`/api/loans/${accountNo}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch loan details");
      }
      const data = await response.json();
      setLoans((prevLoans) =>
        prevLoans.map((loan) =>
          loan.accountNo === accountNo ? { ...loan, ...data } : loan
        )
      );
    } catch (error) {
      toast.error("Error fetching loan details: " + (error as Error).message);
    }
  };

  useEffect(() => {
    if (expandedAccount) {
      fetchLoanDetails(expandedAccount);
    }
  });

  const toggleGuarantorDetails = (accountNo: string) => {
    setExpandedAccount(expandedAccount === accountNo ? null : accountNo);
  };

  const sortedLoans = [...loans].sort((a, b) => {
    const aNum = parseInt(a.accountNo);
    const bNum = parseInt(b.accountNo);
    return aNum - bNum;
  });

  return (
    <div
      className={`w-full mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen ${ubuntu.className} antialiased text-xl font-bold`}
    >
      <div className="mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-orange-500  flex items-center gap-6">
            Loan Ledger
            <span>
              <Link href="/">
                <Home />
              </Link>
            </span>
          </h1>

          <TimeDisplay />
          <button
            onClick={() => {
              if (fromDate && toDate) {
                fetchLoans();
              } else {
                toast.error("Please enter both fromDate and toDate.");
              }
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all flex items-center gap-2 shadow-sm text-xl font-bold"
          >
            <Calendar size={18} />
            Fetch Loans
          </button>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative">
            <label
              htmlFor="fromDate"
              className="block text-xl font-bold text-gray-700 dark:text-gray-300 mb-2"
            >
              From Date
            </label>
            <input
              ref={fromDateRef}
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xl font-bold"
            />
          </div>
          <div className="relative">
            <label
              htmlFor="toDate"
              className="block text-xl font-bold text-gray-700 dark:text-gray-300 mb-2"
            >
              To Date
            </label>
            <input
              ref={toDateRef}
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xl font-bold"
            />
          </div>
        </div>

        {loans.length > 0 && (
          <div className="mb-4 p-4 bg-orange-50 dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-gray-700">
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-4">
              <span>
                {new Date(fromDate).toLocaleDateString("en-GB")} to{" "}
                {new Date(toDate).toLocaleDateString("en-GB")}:
              </span>
              <span className="flex items-center gap-6 text-xl font-bold">
                <span>
                  Monthly Inst:{"  "}
                  <span className="text-orange-600 dark:text-orange-400">
                    ₹
                    <span className="text-2xl font-bold">
                      {loans
                        .filter((loan) => !loan.isDaily)
                        .reduce((sum, loan) => sum + loan.instAmount, 0)
                        .toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
                |
                <span>
                  Daily Inst:{"  "}
                  <span className="text-orange-600 dark:text-orange-400">
                    ₹
                    <span className="text-2xl font-bold">
                      {loans
                        .filter((loan) => loan.isDaily)
                        .reduce((sum, loan) => sum + loan.instAmount, 0)
                        .toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
                |
                <span>
                  Total Amount:{"  "}
                  <span className="text-2xl font-bold">
                    <span className="text-orange-600 dark:text-orange-400">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
              </span>
            </p>
          </div>
        )}

        {/* Loan Details Table */}
        {loans.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full border-collapse auto">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Account No
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Holder Name
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    M. Date
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Installment
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Period
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Loan Date
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Address
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Phone 1
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Phone 2
                  </th>
                  <th className="px-6 py-3 text-xl font-bold text-gray-700 dark:text-gray-300 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedLoans.map((loan, index) => (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {loan.accountNo}
                      </td>
                      <td className="px-3 py-4 text-xl font-bold text-gray-600 dark:text-gray-400 uppercase">
                        {loan.holderName}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {loan.name}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {new Date(loan.mDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400 uppercase">
                        ₹{loan.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        ₹{loan.instAmount.toFixed(2)}{" "}
                        <span className="font-bold text-orange-500 text-xl">
                          ({loan.isDaily ? "D" : "M"})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {loan.period}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {new Date(loan.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {loan.holderAddress}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {loan.telephone1}
                      </td>
                      <td className="px-6 py-4 text-xl font-bold text-gray-600 dark:text-gray-400">
                        {loan.telephone2}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleGuarantorDetails(loan.accountNo)}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-all text-xl font-bold shadow-sm"
                        >
                          {expandedAccount === loan.accountNo ? "Hide" : "Show"}{" "}
                          Guarantors
                        </button>
                      </td>
                    </tr>
                    {expandedAccount === loan.accountNo && (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-4 bg-orange-50 dark:bg-gray-800/50"
                        >
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                              Guarantor Details
                            </h3>
                            <div className="grid gap-4">
                              {loan.guarantors.map((guarantor, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                                        Name
                                      </span>
                                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.holderName}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                                        Phone
                                      </span>
                                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.telephone}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                                        Address
                                      </span>
                                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.address}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                                        City
                                      </span>
                                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.city}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No Data Found Message */}
        {loans.length === 0 && !loading && (
          <div className="mt-8 text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
              No loans found for the selected date range.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-8 text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-xl font-bold text-gray-600 dark:text-gray-400">
              Fetching loans...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanLedger;
