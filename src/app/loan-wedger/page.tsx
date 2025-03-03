"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Calendar, Filter } from "lucide-react";
import { Ubuntu } from "next/font/google";
import TimeDisplay from "@/ui/TimeDisplay";
import { useRouter } from "next/navigation";
import { useNavigationStore } from "@/store/NavigationStore";
import Image from "next/image";

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
  const [allLoans, setAllLoans] = useState<LoanDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loanType, setLoanType] = useState<"all" | "monthly" | "daily">("all");
  const fromDateRef = useRef<HTMLInputElement | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const toDateRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
        setSelectedNavItem("Report", 2);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchLoans = async () => {
    if (loading) return;
  
    if (!fromDate || !toDate) {
      alert("Please enter both fromDate and toDate.");
      return;
    }
  
    // Format dates to include timezone offset
    const formatDateForAPI = (dateStr: string) => {
      const date = new Date(dateStr);
      // Set time to start of day for fromDate
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    };
  
    const formattedFromDate = formatDateForAPI(fromDate);
    const formattedToDate = formatDateForAPI(toDate);
  
    setLoans([]);
    setAllLoans([]);
    setTotalAmount(0);
    setLoading(true);
  
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/loans?fromDate=${encodeURIComponent(formattedFromDate)}&toDate=${encodeURIComponent(formattedToDate)}&timestamp=${timestamp}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch loans");
      }
  
      const data = await response.json();
      setAllLoans(data);
      filterLoans(data, loanType);
      setExpandedAccount(null);
    } catch (error) {
      toast.error("Error fetching loans: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to filter loans based on type
  const filterLoans = (loansData: LoanDetails[], type: "all" | "monthly" | "daily") => {
    let filteredLoans;
    
    if (type === "all") {
      filteredLoans = loansData;
    } else if (type === "monthly") {
      filteredLoans = loansData.filter(loan => !loan.isDaily);
    } else { // daily
      filteredLoans = loansData.filter(loan => loan.isDaily);
    }
    
    setLoans(filteredLoans);
    const total = filteredLoans.reduce(
      (sum: number, loan: LoanDetails) => sum + loan.amount,
      0
    );
    setTotalAmount(total);
  };

  useEffect(() => {
    if (fromDate && toDate) {
      fetchLoans();
    }
  }, [fromDate, toDate]);

  // Apply filter when loan type changes
  useEffect(() => {
    if (allLoans.length > 0) {
      filterLoans(allLoans, loanType);
    }
  }, [loanType]);

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
      setAllLoans((prevLoans) =>
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
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    if (dateA !== dateB) {
      return dateA - dateB;
    }

    const aNum = parseInt(a.accountNo);
    const bNum = parseInt(b.accountNo);
    return aNum - bNum;
  });

  return (
    <div
      className={`w-full mx-auto p-2 sm:p-4 bg-white dark:bg-gray-900 min-h-screen ${ubuntu.className} antialiased text-base sm:text-lg lg:text-xl font-bold`}
    >
      <div className="mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 border-b dark:border-gray-700 pb-4 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-500 flex items-center gap-2 sm:gap-6">
            Loan Ledger
            <span>
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
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all flex items-center gap-2 shadow-sm text-base sm:text-lg lg:text-xl font-bold w-full sm:w-auto"
          >
            <Calendar size={16} className="hidden sm:block" />
            Fetch Loans
          </button>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="relative">
            <label
              htmlFor="fromDate"
              className="block text-base sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
            >
              From Date
            </label>
            <input
              ref={fromDateRef}
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => {
                const date = new Date(e.target.value);
                // Format date as YYYY-MM-DD for internal use
                const formattedDate = date.toISOString().split('T')[0];
                setFromDate(formattedDate);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base sm:text-lg lg:text-xl font-bold"
            />
          </div>
          <div className="relative">
            <label
              htmlFor="toDate"
              className="block text-base sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
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
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base sm:text-lg lg:text-xl font-bold"
            />
          </div>
        </div>

        {/* Loan Type Filter */}
        {allLoans.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-orange-500" />
                <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300">
                  Filter by:
                </span>
              </div>
              <div className="flex gap-2 sm:gap-4">
                <button
                  onClick={() => setLoanType("all")}
                  className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition-all text-sm sm:text-base lg:text-lg font-bold ${
                    loanType === "all"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  All Loans
                </button>
                <button
                  onClick={() => setLoanType("monthly")}
                  className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition-all text-sm sm:text-base lg:text-lg font-bold ${
                    loanType === "monthly"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setLoanType("daily")}
                  className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition-all text-sm sm:text-base lg:text-lg font-bold ${
                    loanType === "daily"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  Daily
                </button>
              </div>
            </div>
          </div>
        )}

        {loans.length > 0 && (
          <div className="mb-4 p-3 sm:p-4 bg-orange-50 dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-gray-700 overflow-x-auto">
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <span>
                {new Date(fromDate).toLocaleDateString("en-GB")} to{" "}
                {new Date(toDate).toLocaleDateString("en-GB")}:
              </span>
              <span className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 text-sm sm:text-lg lg:text-xl font-bold w-full">
                <span>
                  Monthly Inst:{"  "}
                  <span className="text-orange-600 dark:text-orange-400">
                    ₹
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold">
                      {loans
                        .filter((loan) => !loan.isDaily)
                        .reduce((sum, loan) => sum + loan.instAmount, 0)
                        .toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
                <span className="hidden sm:inline">|</span>
                <span>
                  Daily Inst:{"  "}
                  <span className="text-orange-600 dark:text-orange-400">
                    ₹
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold">
                      {loans
                        .filter((loan) => loan.isDaily)
                        .reduce((sum, loan) => sum + loan.instAmount, 0)
                        .toLocaleString("en-IN")}
                    </span>
                  </span>
                </span>
                <span className="hidden sm:inline">|</span>
                <span>
                  Total Amount:{"  "}
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold">
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
          <div className="min-w-full overflow-x-auto">
            <table className="w-full border-collapse table-auto">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    SR No.
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Acc No
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Holder
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Loan Date
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    M. Date
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Amount
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Inst
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Period
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Address
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Phone 1
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Phone 2
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedLoans.map((loan, index) => (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-2 text-center sm:px-4 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {loan.accountNo}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap uppercase">
                        {loan.holderName}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap uppercase">
                        {loan.name}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(loan.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(loan.mDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">
                        ₹{loan.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 sm:px-5 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        ₹{loan.instAmount.toFixed(2)}{" "}
                        <span className="font-bold text-orange-500 text-sm sm:text-lg lg:text-xl">
                          ({loan.isDaily ? "D" : "M"})
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {loan.period}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 max-w-xs truncate uppercase">
                        {loan.holderAddress}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {loan.telephone1}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {loan.telephone2}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4">
                        <button
                          onClick={() => toggleGuarantorDetails(loan.accountNo)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-all text-sm sm:text-lg lg:text-xl font-bold shadow-sm whitespace-nowrap"
                        >
                          {expandedAccount === loan.accountNo ? "Hide" : "Show"} Guarantors
                        </button>
                      </td>
                    </tr>
                    {expandedAccount === loan.accountNo && (
                      <tr>
                        <td colSpan={13} className="px-2 sm:px-6 py-2 sm:py-4 bg-orange-50 dark:bg-gray-800/50">
                          <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100">
                              Guarantor Details
                            </h3>
                            <div className="grid gap-3 sm:gap-4">
                              {loan.guarantors.map((guarantor, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 uppercase sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                    <div>
                                      <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-500 dark:text-gray-400">
                                        Name
                                      </span>
                                      <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.holderName}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-500 dark:text-gray-400">
                                        Phone
                                      </span>
                                      <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.telephone}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-500 dark:text-gray-400">
                                        Address
                                      </span>
                                      <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {guarantor.address}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-500 dark:text-gray-400">
                                        City
                                      </span>
                                      <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100">
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
        </div>
      )}

        {/* No Data Found Message */}
        {loans.length === 0 && !loading && (
          <div className="mt-6 sm:mt-8 text-center p-4 sm:p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400">
              No loans found for the selected date range.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-6 sm:mt-8 text-center p-4 sm:p-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg lg:text-xl font-bold text-gray-600 dark:text-gray-400">
              Fetching loans...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanLedger;
