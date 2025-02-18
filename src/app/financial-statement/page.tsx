"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Wallet, PiggyBank, AlertTriangle } from "lucide-react";
import TimeDisplay from "@/ui/TimeDisplay";
import { Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

const FinancialStatement = () => {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalReceivedAmount, setTotalReceivedAmount] = useState<number | null>(
    null
  );
  const [monthlyTotal, setMonthlyTotal] = useState([]);
  const [dailyTotal, setDailyTotal] = useState([]);
  const [monthlyAccountCount, setMonthlyAccountCount] = useState([]);
  const [dailyAccountCount, setDailyAccountCount] = useState([]);
  const [overallTotals, setOverallTotals] = useState({
    totalMonthlyAccounts: 0,
    totalDailyAccounts: 0,
    totalMonthlyInstallments: 0,
    totalDailyInstallments: 0,
  });

  const outStandingAmount = (totalLoanAmount ?? 0) - (totalReceivedAmount ?? 0);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/");
      }
      if (event.altKey && event.key === "d") {
        event.preventDefault();
        setIsDarkMode((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          monthlyRes,
          dailyRes,
          monthlyAccountRes,
          dailyAccountRes,
          overallRes,
          receivedAmountRes,
          loansRes,
        ] = await Promise.all([
          fetch("/api/loans?monthlyTotal=true"),
          fetch("/api/loans?dailyTotal=true"),
          fetch("/api/loans?monthlyAccountCount=true"),
          fetch("/api/loans?dailyAccountCount=true"),
          fetch("/api/loans?overallTotal=true"),
          fetch("/api/payments?totalReceivedAmount=true"),
          fetch("/api/loans?totalAmount=true"),
        ]);

        setMonthlyTotal(await monthlyRes.json());
        setDailyTotal(await dailyRes.json());
        setMonthlyAccountCount(await monthlyAccountRes.json());
        setDailyAccountCount(await dailyAccountRes.json());
        setOverallTotals(await overallRes.json());
        setTotalReceivedAmount(
          (await receivedAmountRes.json()).totalReceivedAmount
        );
        setTotalLoanAmount((await loansRes.json()).totalLoanAmount);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (date: string, type: "daily" | "monthly") => {
    const [year, month, day] = date.split("-");
    if (type === "daily") {
      return `${day}-${month}-${year}`;
    } else {
      return `${month}-${year}`;
    }
  };

  const Table = ({
    title,
    data,
    columns,
    type,
  }: {
    title: string;
    data: any[];
    columns: { key: string; label: string }[];
    type: "daily" | "monthly";
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
          {title}
          <ArrowUpRight className="ml-2 w-4 h-4 text-gray-400" />
        </h2>
      </div>
      <div className="overflow-x-auto">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((item: any, index: number) => (
                <tr
                  key={index}
                  className="hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300"
                    >
                      {column.key.includes("amount")
                        ? `₹${item[column.key]?.toLocaleString() || "0"}`
                        : column.key.includes("date")
                        ? formatDate(
                            `${item._id.year}-${item._id.month}-${
                              item._id.day || "01"
                            }`,
                            type
                          )
                        : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${ubuntu.className}`}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500">
            Financial Statement
          </h1>
          <TimeDisplay />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6 rounded-xl shadow-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 upper case">
                Total Finance
              </h2>
              <Wallet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              ₹{totalLoanAmount?.toLocaleString() || "0"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl sahadow-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 uppercase">
                Collection Receievd From Client
              </h2>
              <PiggyBank className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              ₹{totalReceivedAmount?.toLocaleString() || "0"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl shadow-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-200 uppercase">
                Collection Outstanding to client
              </h2>
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              ₹{outStandingAmount.toLocaleString() || "0"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 w-full">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
            Overall Totals
            <ArrowUpRight className="ml-2 w-4 h-4 text-gray-400" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {[
              {
                label: "Number of active loans(Monthly)",
                value: overallTotals.totalMonthlyAccounts,
              },
              {
                label: "Number of active loans(Daily)",
                value: overallTotals.totalDailyAccounts,
              },
              {
                label: "Total Monthly Installments",
                value: `₹${overallTotals.totalMonthlyInstallments.toLocaleString()}`,
              },
              {
                label: "Total Daily Installments",
                value: `₹${overallTotals.totalDailyInstallments.toLocaleString()}`,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <span className="text-gray-600 dark:text-gray-400 uppercase text-lg font-bold">
                  {item.label}
                </span>
                <span className=" text-gray-900 dark:text-gray-100 text-2xl font-bold">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialStatement;
