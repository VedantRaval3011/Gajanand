"use client";
import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import TimeDisplay from "@/ui/TimeDisplay";
import { Ubuntu } from "next/font/google";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/utils/routeMapping";
import { useNavigationStore } from "@/store/NavigationStore";
import Image from "next/image";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

interface Payment {
  _id: string;
  accountNo: string;
  amountPaid: number;
  paymentDate: string;
  lateAmount: number;
  isDefaultAmount: boolean;
}

interface AccountData {
  accountNo: string;
  payments: Payment[];
}

interface TotalPaymentsPerAccount {
  accountNo: string;
  totalPaid: number;
}

export default function Home() {
  const getCurrentYearMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<AccountData[]>([]);
  const [totalPayments, setTotalPayments] = useState<TotalPaymentsPerAccount[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    // Only switch to dark mode if specifically set to "dark"
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      // Default to light mode if no theme or any other value
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
      // Ensure light theme is saved as default if no theme exists
      if (!savedTheme) {
        localStorage.setItem("theme", "light");
      }
    }
  }, []);

    const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      // Save to localStorage when toggling
      localStorage.setItem("theme", newMode ? "dark" : "light");
      
      // Apply to document for global styling
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      return newMode;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getMonthAndYear = (
    monthStr: string
  ): { month: string; year: string } | null => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split("-");
    return { month, year };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchData();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedMonth(newDate);
    setError("");
  };

  const calculateDailyTotals = (
    accounts: AccountData[],
    daysInMonth: number
  ): number[] => {
    const dailyTotals = new Array(daysInMonth).fill(0);

    accounts.forEach((account) => {
      account.payments.forEach((payment) => {
        const day = new Date(payment.paymentDate).getDate();
        dailyTotals[day - 1] += payment.amountPaid;
      });
    });

    return dailyTotals;
  };

  const fetchData = async () => {
    const dateParts = getMonthAndYear(selectedMonth);
    if (!dateParts) {
      setError("Please select a valid month.");
      return;
    }

    const { month, year } = dateParts;
    setLoading(true);
    setError("");

    try {
      const [historyResponse, totalPaymentsResponse] = await Promise.all([
        fetch(`/api/payment-history/data?year=${year}&month=${month}`),
        fetch("/api/payments?totalPerAccount=true"),
      ]);

      if (!historyResponse.ok || !totalPaymentsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const historyResult: AccountData[] = await historyResponse.json();
      const totalPaymentsResult: { payments: TotalPaymentsPerAccount[] } =
        await totalPaymentsResponse.json();

      setData(historyResult);
      setTotalPayments(
        Array.isArray(totalPaymentsResult.payments)
          ? totalPaymentsResult.payments
          : []
      );
    } catch {
      setError("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (account: AccountData) => {
    const totalForMonth = account.payments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0
    );
    const overallTotal =
      totalPayments.find((tp) => tp.accountNo === account.accountNo)
        ?.totalPaid || 0;
    const prevReceivedAmount = overallTotal - totalForMonth;
    return { prevReceivedAmount, totalForMonth, overallTotal };
  };

  const getDaysInMonth = (year: string, month: string): number => {
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };
  
  useNavigation({
    onEscape: () => {}, // We don't need to handle anything here since Navbar will handle the selection
  });

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedNavItem("Report", 0); // Set to "Report" with the first sub-item focused
        router.push("/");
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  const daysInMonth = selectedMonth
    ? getDaysInMonth(selectedMonth.split("-")[0], selectedMonth.split("-")[1])
    : 0;
  const dailyTotals =
    data.length > 0 ? calculateDailyTotals(data, daysInMonth) : [];

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      } ${ubuntu.className} antialiased`}
    >
      {/* Header Section - Made Responsive */}
      <div
        className={`w-full ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          {darkMode ? (
            <Image
              src="/GFLogo.png"
              alt="logo"
              height={50}
              width={50}
              className="w-12 lg:w-14 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
              onClick={() => router.push("/")}
            ></Image>
          ) : (
            <Image
              src="/lightlogo.png"
              alt="logo"
              height={50}
              width={50}
              className="w-12 lg:w-14 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
              onClick={() => router.push("/")}
            ></Image>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center sm:text-left">
            Payment History Dashboard
          </h1>

          <div className="flex items-center gap-4">
            <TimeDisplay />
          </div>
        </div>
      </div>

      {/* Main Content - Made Responsive */}
      <div className="mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Input Section - Made Responsive */}
        <div
          className={`mb-4 sm:mb-8 p-4 sm:p-6 rounded-lg shadow-md ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4">
            <div className="flex-1">
              <label className="block font-bold text-lg sm:text-xl mb-2 text-orange-500">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                autoFocus
                onChange={handleDateChange}
                onKeyPress={handleKeyPress}
                className={`w-full px-3 sm:px-4 py-2 rounded-md border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-orange-500 text-base sm:text-xl font-bold`}
                max={getCurrentYearMonth()}
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-md flex items-center justify-center gap-2 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              } text-white transition-colors duration-200`}
            >
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Fetch Data
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Table Section - Made Responsive */}
        {data.length > 0 ? (
          <div
            className={`rounded-lg shadow-md overflow-x-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="min-w-[1000px]">
              {" "}
              {/* Minimum width container for horizontal scroll */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
                    <th
                      className={`sticky left-0 p-2 sm:p-4 font-semibold text-left border-b ${
                        darkMode ? "bg-orange-700" : "bg-orange-200"
                      } text-sm sm:text-base`}
                    >
                      Account No.
                    </th>
                    {[...Array(daysInMonth)].map((_, i) => (
                      <th
                        key={i}
                        className="p-2 sm:p-4 font-semibold text-center border-b min-w-[50px] sm:min-w-[60px] text-sm sm:text-lg"
                      >
                        {i + 1}
                      </th>
                    ))}
                    <th className="p-2 sm:p-4 font-semibold text-center border-b text-sm sm:text-base">
                      Month Total
                    </th>
                    <th className="p-2 sm:p-4 font-semibold text-center border-b text-sm sm:text-base">
                      Overall Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((account, idx) => {
                    const totals = calculateTotals(account);
                    return (
                      <tr
                        key={account.accountNo}
                        className={`
                          ${
                            darkMode
                              ? idx % 2 === 0
                                ? "bg-gray-800"
                                : "bg-gray-700"
                              : idx % 2 === 0
                              ? "bg-white"
                              : "bg-gray-50"
                          }
                          hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors duration-150
                        `}
                      >
                        <td
                          className={`sticky left-0 p-2 sm:p-4 font-medium border-b hover:text-orange-500 ${
                            darkMode ? "bg-amber-700" : "bg-orange-200"
                          } text-sm sm:text-lg`}
                        >
                          {account.accountNo}
                        </td>
                        {[...Array(daysInMonth)].map((_, dayIndex) => {
                          const payment = account.payments.find(
                            (p) =>
                              new Date(p.paymentDate).getDate() === dayIndex + 1
                          );
                          return (
                            <td
                              key={dayIndex}
                              className="p-2 sm:p-4 text-center border-b text-sm sm:text-base"
                            >
                              {payment ? (
                                <span
                                  className={`font-bold ${
                                    payment.amountPaid > 0
                                      ? "text-green-600 dark:text-green-400"
                                      : ""
                                  }`}
                                >
                                  {payment.amountPaid.toLocaleString()}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 sm:p-4 text-center border-b font-bold text-orange-600 dark:text-orange-400 text-sm sm:text-lg">
                          {totals.totalForMonth.toLocaleString()}
                        </td>
                        <td className="p-2 sm:p-4 text-center border-b font-bold text-purple-600 dark:text-purple-400 text-sm sm:text-lg">
                          {totals.overallTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Daily Totals Row */}
                  <tr
                    className={`${
                      darkMode ? "bg-gray-900" : "bg-gray-100"
                    } font-bold`}
                  >
                    <td className="sticky left-0 p-2 sm:p-4 border-b bg-orange-300 text-sm sm:text-base">
                      Totals
                    </td>
                    {dailyTotals.map((total, index) => (
                      <td
                        key={index}
                        className="p-2 sm:p-4 text-center border-b font-bold text-sm sm:text-lg text-blue-600 dark:text-blue-400"
                      >
                        {total > 0 ? total.toLocaleString() : "-"}
                      </td>
                    ))}
                    <td className="p-2 sm:p-4 text-center border-b text-orange-600 dark:text-orange-400 text-sm sm:text-lg">
                      {dailyTotals.reduce((a, b) => a + b, 0).toLocaleString()}
                    </td>
                    <td className="p-2 sm:p-4 text-center border-b text-purple-600 dark:text-purple-400 text-sm sm:text-lg">
                      {totalPayments
                        .reduce((sum, tp) => sum + tp.totalPaid, 0)
                        .toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className={`text-center p-4 sm:p-8 rounded-lg shadow-md ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <p className="text-base sm:text-lg font-medium">
              No payments exist for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}