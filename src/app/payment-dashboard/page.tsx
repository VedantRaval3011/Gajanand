'use client';
import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import TimeDisplay from '@/ui/TimeDisplay';
import { Ubuntu } from 'next/font/google';
import { useRouter } from 'next/navigation';

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
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<AccountData[]>([]);
  const [totalPayments, setTotalPayments] = useState<TotalPaymentsPerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
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

  const getMonthAndYear = (monthStr: string): { month: string; year: string } | null => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split('-');
    return { month, year };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchData();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedMonth(newDate);
    setError('');
  };

  const calculateDailyTotals = (accounts: AccountData[], daysInMonth: number): number[] => {
    const dailyTotals = new Array(daysInMonth).fill(0);
    
    accounts.forEach(account => {
      account.payments.forEach(payment => {
        const day = new Date(payment.paymentDate).getDate();
        dailyTotals[day - 1] += payment.amountPaid;
      });
    });
    
    return dailyTotals;
  };

  const fetchData = async () => {
    const dateParts = getMonthAndYear(selectedMonth);
    if (!dateParts) {
      setError('Please select a valid month.');
      return;
    }

    const { month, year } = dateParts;
    setLoading(true);
    setError('');

    try {
      const [historyResponse, totalPaymentsResponse] = await Promise.all([
        fetch(`/api/payment-history/data?year=${year}&month=${month}`),
        fetch('/api/payments?totalPerAccount=true'),
      ]);

      if (!historyResponse.ok || !totalPaymentsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const historyResult: AccountData[] = await historyResponse.json();
      const totalPaymentsResult: { payments: TotalPaymentsPerAccount[] } = await totalPaymentsResponse.json();

      setData(historyResult);
      setTotalPayments(Array.isArray(totalPaymentsResult.payments) ? totalPaymentsResult.payments : []);
    } catch (err) {
      setError('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (account: AccountData) => {
    const totalForMonth = account.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const overallTotal = totalPayments.find((tp) => tp.accountNo === account.accountNo)?.totalPaid || 0;
    const prevReceivedAmount = overallTotal - totalForMonth;
    return { prevReceivedAmount, totalForMonth, overallTotal };
  };

  const getDaysInMonth = (year: string, month: string): number => {
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const daysInMonth = selectedMonth ? 
    getDaysInMonth(selectedMonth.split('-')[0], selectedMonth.split('-')[1]) : 0;
  const dailyTotals = data.length > 0 ? calculateDailyTotals(data, daysInMonth) : [];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} ${ubuntu.className} antialiased`}>
      {/* Header Section */}
      <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Payment History Dashboard</h1>
          <div className="flex items-center gap-4">
            <TimeDisplay />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-4 py-8">
        {/* Input Section */}
        <div className={`mb-8 p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-end gap-4">
            <div className="flex-1">
              <label className="block  font-bold text-xl mb-2 text-orange-500">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                autoFocus
                onChange={handleDateChange}
                onKeyPress={handleKeyPress}
                className={`w-full px-4 py-2 rounded-md border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-orange-500 text-xl font-bold`}
                max={getCurrentYearMonth()}
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className={`px-6 py-2 rounded-md flex items-center gap-2 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
              } text-white transition-colors duration-200`}
            >
              {loading ? 'Loading...' : (
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

        {/* Table Section */}
        {data.length > 0 ? (
          <div className={`rounded-lg shadow-md overflow-x-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <table className="w-full border-collapse">
              <thead>
                <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <th className={`sticky left-0 p-4 font-semibold text-left border-b ${darkMode ? 'bg-orange-700' : 'bg-orange-200'}`}>Account No.</th>
                  {[...Array(daysInMonth)].map((_, i) => (
                    <th key={i} className="p-4 font-semibold text-center border-b min-w-[60px] text-lg">
                      {i + 1}
                    </th>
                  ))}
                  <th className="p-4 font-semibold text-center border-b">Month Total</th>
                  <th className="p-4 font-semibold text-center border-b">Overall Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((account, idx) => {
                  const totals = calculateTotals(account);
                  return (
                    <tr
                      key={account.accountNo}
                      className={`
                        ${darkMode ? (idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700') : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors duration-150 rounded-lg shadow-lg
                      `}
                    >
                      <td className={`sticky left-0 p-4 font-medium border-b hover:text-orange-500 ${darkMode ? 'bg-amber-700' : 'bg-orange-200 text-lg'}`}>
                        {account.accountNo}
                      </td>
                      {[...Array(daysInMonth)].map((_, dayIndex) => {
                        const payment = account.payments.find(
                          (p) => new Date(p.paymentDate).getDate() === dayIndex + 1
                        );
                        return (
                          <td key={dayIndex} className="p-4 text-center border-b">
                            {payment ? (
                              <span className={`font-bold ${payment.amountPaid > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {payment.amountPaid.toLocaleString()}
                              </span>
                            ) : '-'}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center border-b font-bold text-orange-600 dark:text-orange-400 text-lg">
                        {totals.totalForMonth.toLocaleString()}
                      </td>
                      <td className="p-4 text-center border-b font-bold text-purple-600 dark:text-purple-400 text-lg">
                        {totals.overallTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {/* Daily Totals Row */}
                <tr className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} font-bold`}>
                  <td className="sticky left-0 p-4 border-b bg-orange-300">Totals</td>
                  {dailyTotals.map((total, index) => (
                    <td key={index} className="p-4 text-center border-b font-bold text-lg text-blue-600 dark:text-blue-400">
                      {total > 0 ? total.toLocaleString() : '-'}
                    </td>
                  ))}
                  <td className="p-4 text-center border-b text-orange-600 dark:text-orange-400 text-lg">
                    {dailyTotals.reduce((a, b) => a + b, 0).toLocaleString()}
                  </td>
                  <td className="p-4 text-center border-b text-purple-600 dark:text-purple-400 text-lg">
                    {totalPayments.reduce((sum, tp) => sum + tp.totalPaid, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center p-8 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className="text-lg font-medium">No payments exist for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
}