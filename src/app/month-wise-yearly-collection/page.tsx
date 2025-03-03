"use client";
import { useNavigationStore } from "@/store/NavigationStore";
import { Ubuntu } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

export default function PaymentHistory() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<{
    totalsByMonthAndAccount: Record<number, Record<string, number>>;
  }>({ totalsByMonthAndAccount: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

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
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
        setSelectedNavItem("Report", 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchData = async () => {
    if (!year) {
      setError("Please enter a valid year.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/payment-history?year=${year}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }
      const result = await response.json();
      setData(result);
    } catch {
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchData();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const calculateMonthlyTotals = () => {
    const { totalsByMonthAndAccount } = data;
    const monthlyTotals: { [key: number]: number } = {};

    for (const [month, accounts] of Object.entries(totalsByMonthAndAccount)) {
      monthlyTotals[parseInt(month)] = Object.values(
        accounts as Record<string, number>
      ).reduce((sum, amount) => sum + amount, 0);
    }
    return monthlyTotals;
  };

  const calculateAccountTotal = (accountNo: string) => {
    let total = 0;
    months.forEach((month) => {
      total += totalsByMonthAndAccount[month]?.[accountNo] || 0;
    });
    return total;
  };

  const { totalsByMonthAndAccount } = data;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const accountNos = Array.from(
    new Set(
      Object.values(totalsByMonthAndAccount).flatMap((monthData) =>
        Object.keys(monthData)
      )
    )
  )
    .sort((a, b) => parseInt(a) - parseInt(b))
    .filter((accountNo) =>
      accountNo.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div
      className={`p-3 sm:p-6 min-h-screen mx-auto ${ubuntu.className} ${
        isDarkMode ? "dark bg-gray-900 text-white" : "bg-white text-gray-900"
      } text-base sm:text-xl font-bold`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-orange-500">
            Month Wise Yearly Collection
          </h1>
        </div>
       
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4 mb-4 sm:mb-6">
        <input
          ref={inputRef}
          type="number"
          placeholder="Enter year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          onKeyDown={handleKeyPress}
          className={`w-full sm:w-auto px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-base sm:text-xl font-bold ${
            isDarkMode
              ? "border-gray-600 bg-gray-800 text-white focus:ring-orange-500"
              : "border-gray-300 focus:ring-orange-500"
          }`}
        />
        <button
          onClick={fetchData}
          disabled={loading}
          className={`w-full sm:w-auto px-3 sm:px-4 py-2 rounded-md transition text-base sm:text-xl font-bold ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : isDarkMode
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
        >
          {loading ? "Loading..." : "Fetch Data"}
        </button>
      </div>

      <div className="mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Search by Account No."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-base sm:text-xl font-bold ${
            isDarkMode
              ? "border-gray-600 bg-gray-800 text-white focus:ring-orange-500"
              : "border-gray-300 focus:ring-orange-500"
          }`}
        />
      </div>

      {error && (
        <p className="text-red-500 mb-4 text-xl sm:text-2xl font-bold">
          {error}
        </p>
      )}

      {loading ? (
        <div className="text-center py-8 text-base sm:text-xl font-bold">
          Loading...
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm sm:text-base md:text-xl">
              <thead className={`${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}>
                <tr>
                  <th
                    scope="col"
                    className={`sticky left-0 z-10 ${
                      isDarkMode ? "bg-gray-800" : "bg-gray-50"
                    } px-1 sm:px-2 py-2 sm:py-3 text-left text-xs sm:text-sm md:text-xl font-bold uppercase ${
                      isDarkMode ? "text-gray-200" : "text-gray-500"
                    }`}
                  >
                    Account
                  </th>
                  {months.map((month) => {
                    const monthlyTotals = calculateMonthlyTotals();
                    const total = monthlyTotals[month];
                    return (
                      <th
                        key={month}
                        scope="col"
                        className={`px-3 sm:px-3 md:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm md:text-xl font-bold uppercase ${
                          isDarkMode ? "text-gray-200" : "text-gray-500"
                        }`}
                      >
                        {month}
                        {total ? (
                          <div
                            className={`text-xs sm:text-base md:text-2xl font-bold mt-1 sm:mt-2 text-red-600 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {total}
                          </div>
                        ) : null}
                      </th>
                    );
                  })}
                  <th
                    scope="col"
                    className={`px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm md:text-xl font-bold uppercase ${
                      isDarkMode ? "text-gray-200" : "text-gray-500"
                    }`}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-gray-200 ${
                  isDarkMode ? "bg-gray-900 divide-gray-700" : "bg-white"
                }`}
              >
                {accountNos.map((accountNo) => (
                  <tr
                    key={accountNo}
                    className={
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"
                    }
                  >
                    <td
                      className={`sticky left-5 z-10 ${
                        isDarkMode ? "bg-gray-900" : "bg-white"
                      } ${
                        isDarkMode && "hover:bg-gray-800"
                      } px-1 sm:px-2 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm md:text-xl font-bold ${
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {accountNo}
                    </td>
                    {months.map((month) => (
                      <td
                        key={month}
                        className={`px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm md:text-xl font-bold text-center ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {totalsByMonthAndAccount[month]?.[accountNo] || 0}
                      </td>
                    ))}
                    <td
                      className={`px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-sm sm:text-lg md:text-2xl font-bold text-center text-emerald-600`}
                    >
                      {calculateAccountTotal(accountNo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}