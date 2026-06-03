"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import TimeDisplay from "@/ui/TimeDisplay";
import { Ubuntu } from "next/font/google";
import AccountFinder from "@/components/accountFinder/AccountFinder";
import { useNavigationStore } from "@/store/NavigationStore";
import Image from "next/image";
import { Search } from "lucide-react";

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

interface Payment {
  _id: string;
  paymentDate: string;
  amountPaid: number;
}

interface CellPayment {
  _id: string;
  amountPaid: number;
}

interface PaymentData {
  monthYear: string;
  days: CellPayment[][];
  totalAmount: number;
}

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
  telephone2?: string;
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

export default function PaymentHistory() {
  const [accountNo, setAccountNo] = useState("");
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loanDetails, setLoanDetails] = useState<LoanDetails>();
  const [finalReceivedAmount, setFinalReceivedAmount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedAccountNo, setSelectedAccountNo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const totalToBePaid = (loanDetails?.mAmount ?? 0) - finalReceivedAmount;
  const accountInputRef = useRef<HTMLInputElement>(null);
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
        setSelectedNavItem("Report", 3);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAccountSelect = (accountNo: string) => {
    setSelectedAccountNo(accountNo);
    setAccountNo(accountNo);

    // Focus the input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      if (accountInputRef.current) {
        accountInputRef.current.focus();
      }
    }, 0);
  };

  // Rest of your existing functions remain the same...
  const fetchLoanDetails = async () => {
    if (!accountNo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${accountNo}`);
      if (!res.ok) {
        setLoanDetails(undefined);
        setPaymentData([]);
        alert("Loan does not exist"); // or use toast notification
        return;
      }
      const details = await res.json();
      setLoanDetails(details);
      await fetchPaymentHistory();
    } catch {
      setLoanDetails(undefined);
      setPaymentData([]);
      alert("Loan does not exist"); // or use toast notification
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountNo(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchLoanDetails();
    }
  };

  const fetchPaymentHistory = async () => {
    if (!accountNo) return;
    try {
      const res = await fetch(`/api/payment-history/${accountNo}`);
      if (!res.ok) throw new Error("Failed to fetch payment history");
      const payments = await res.json();
      processPaymentData(payments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  const processPaymentData = (payments: Payment[]) => {
    const groupedData: {
      [key: string]: { days: CellPayment[][]; totalAmount: number };
    } = {};
    let cumulativeTotal = 0;

    const sortedPayments = payments.sort(
      (a, b) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );

    sortedPayments.forEach((payment) => {
      const date = new Date(payment.paymentDate);
      const yearMonth = `${date.getMonth() + 1}-${date.getFullYear()}`;
      const day = date.getDate();
      if (!groupedData[yearMonth]) {
        groupedData[yearMonth] = {
          days: Array.from({ length: 31 }, () => []),
          totalAmount: 0,
        };
      }
      groupedData[yearMonth].days[day - 1].push({
        _id: String(payment._id),
        amountPaid: payment.amountPaid,
      });
      groupedData[yearMonth].totalAmount += payment.amountPaid;
      cumulativeTotal += payment.amountPaid;
    });

    setFinalReceivedAmount(cumulativeTotal);

    const sortedData = Object.entries(groupedData)
      .sort(([a], [b]) => {
        return (
          new Date(
            parseInt(a.split("-")[1]),
            parseInt(a.split("-")[0]) - 1
          ).getTime() -
          new Date(
            parseInt(b.split("-")[1]),
            parseInt(b.split("-")[0]) - 1
          ).getTime()
        );
      })
      .map(([monthYear, data]) => ({
        monthYear,
        ...data,
      }));

    setPaymentData(sortedData);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;

    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete payment");
      await fetchPaymentHistory();
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Failed to delete payment");
    }
  };

  const handleDeleteAllPayments = async () => {
    if (!accountNo) return;
    if (
      !window.confirm(
        `Delete all payment entries for account ${accountNo}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-history/${accountNo}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete all payments");
      setPaymentData([]);
      setFinalReceivedAmount(0);
    } catch (error) {
      console.error("Error deleting all payments:", error);
      alert("Failed to delete all payments");
    }
  };

  const handleDeleteAndReset = async () => {
    if (!accountNo) return;
    if (
      !window.confirm(
        `Delete all payments AND reset the loan date to today for account ${accountNo}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // 1. Delete all payments for this account
      const delRes = await fetch(`/api/payment-history/${accountNo}`, {
        method: "DELETE",
      });
      if (!delRes.ok) throw new Error("Failed to delete all payments");

      // 2. Reset the loan date to today and recalculate the maturity date
      //    (maturity date = loan date + period days)
      const newLoanDate = new Date();
      const newMaturityDate = new Date(newLoanDate);
      newMaturityDate.setDate(
        newMaturityDate.getDate() + (loanDetails?.period ?? 0)
      );

      const updateRes = await fetch(`/api/loans`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNo,
          date: newLoanDate.toISOString(),
          mDate: newMaturityDate.toISOString(),
        }),
      });
      if (!updateRes.ok) throw new Error("Failed to reset loan date");
      const updatedLoan = await updateRes.json();

      setPaymentData([]);
      setFinalReceivedAmount(0);
      setLoanDetails(updatedLoan);
    } catch (error) {
      console.error("Error deleting payments and resetting loan date:", error);
      alert("Failed to delete payments and reset loan date");
    }
  };

  return (
    <div
      className={`p-2 sm:p-4 mx-auto w-full min-h-screen transition-colors duration-200 ${
        ubuntu.className
      } 
      ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"}`}
    >
      <div className="flex flex-col sm:flex-row justify-start sm:justify-start items-center mb-4 sm:mb-6 relative">
        <div className="flex items-center gap-2 sm:gap-4">
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-500 mb-2 sm:mb-0">
            Deposit Ledger
          </h1>
          <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 p-2.5 bg-orange-500 hover:bg-orange-600 lg:hidden text-white rounded-full transition-colors"
            >
              <Search size={20} />
            </button>
        </div>
        <div className="sm:absolute right-0 flex items-center gap-2 sm:gap-4">
          <TimeDisplay />
        </div>
      </div>

      {/* Search Section */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-4">
        <input
          type="text"
          placeholder="Enter Account No."
          ref={accountInputRef}
          value={accountNo}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          autoFocus
          className={`flex-1 rounded-lg px-3 sm:px-6 py-3 sm:py-4 text-base sm:text-xl font-bold focus:outline-none focus:ring-2 transition-all
            ${
              isDarkMode
                ? "bg-gray-800 border-orange-600 text-white placeholder-gray-400 focus:ring-orange-500"
                : "bg-white border-orange-300 focus:ring-orange-500"
            }`}
        />
        <button
          onClick={fetchLoanDetails}
          disabled={loading || !accountNo}
          className={`px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-xl font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] sm:min-w-[160px]
            ${
              isDarkMode
                ? "bg-orange-600 hover:bg-orange-700 text-white"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="hidden">{selectedAccountNo}</span>
              Loading...
            </>
          ) : (
            "Fetch Details"
          )}
        </button>
      </div>

      {/* Loan Details Section */}
      {loanDetails && (
        <div
          className={`mb-4 sm:mb-6 rounded-lg border overflow-hidden transition-colors duration-200
          ${
            isDarkMode
              ? "bg-gradient-to-r from-gray-800 to-gray-700 border-orange-800"
              : "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
          }`}
        >
          <div
            className={`p-3 sm:p-4 border-b ${
              isDarkMode ? "border-orange-800" : "border-orange-200"
            }`}
          >
            <h2
              className={`text-xl sm:text-2xl font-bold ${
                isDarkMode ? "text-orange-400" : "text-orange-800"
              }`}
            >
              Loan Details
            </h2>
          </div>
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-sm sm:text-base md:text-xl font-bold">
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Account No.
                </p>
                <p className="mt-1">{loanDetails.accountNo}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Name
                </p>
                <p className="mt-1">{loanDetails.name}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Holder Name
                </p>
                <p className="mt-1 break-words">{loanDetails.holderName}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Address
                </p>
                <p className="mt-1 break-words">{loanDetails.holderAddress}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Telephone 1
                </p>
                <p className="mt-1">{loanDetails.telephone1}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Telephone 2
                </p>
                <p className="mt-1">{loanDetails.telephone2 || '-'}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Loan Date
                </p>
                <p className="mt-1">
                  {new Date(loanDetails.date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Maturity Date
                </p>
                <p className="mt-1">
                  {new Date(loanDetails.mDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Installment
                </p>
                <p className="mt-1">
                  {loanDetails.isDaily ? "Daily" : "Monthly"}
                </p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Installment Amount
                </p>
                <p className="mt-1">₹{loanDetails.instAmount.toFixed(2)}</p>
              </div>
              <div>
                <p
                  className={`font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-600"
                  }`}
                >
                  Maturity Amount
                </p>
                <p className="mt-1">₹{loanDetails.mAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Section */}
      {paymentData.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <div
            className={`flex-1 overflow-x-auto rounded-lg shadow-sm border max-h-[400px] sm:max-h-[500px] transition-colors duration-200
            ${
              isDarkMode
                ? "bg-gray-800 border-orange-800"
                : "bg-white border-orange-200"
            }`}
          >
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full divide-y text-xs sm:text-sm md:text-xl font-bold">
                <thead
                  className={`sticky top-0 z-10 ${
                    isDarkMode ? "bg-gray-900" : "bg-orange-50"
                  }`}
                >
                  <tr>
                    <th
                      className={`sticky left-0 z-20 ${
                        isDarkMode ? "bg-gray-900" : "bg-orange-50"
                      } px-2 sm:px-6 py-2 sm:py-4 text-left font-bold ${
                        isDarkMode ? "text-orange-400" : "text-orange-800"
                      }`}
                    >
                      Month-Year
                    </th>
                    {[...Array(31)].map((_, i) => (
                      <th
                        key={i}
                        className={`px-2 sm:px-4 py-2 sm:py-4 text-center font-bold whitespace-nowrap ${
                          isDarkMode ? "text-orange-400" : "text-orange-800"
                        }`}
                      >
                        {i + 1}
                      </th>
                    ))}
                    <th
                      className={`px-2 sm:px-6 py-2 sm:py-4 text-right font-bold whitespace-nowrap ${
                        isDarkMode ? "text-orange-400" : "text-orange-800"
                      }`}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isDarkMode ? "divide-gray-700" : "divide-orange-100"
                  }`}
                >
                  {paymentData.map((row, index) => (
                    <tr
                      key={index}
                      className={
                        isDarkMode ? "hover:bg-gray-700" : "hover:bg-orange-50"
                      }
                    >
                      <td
                        className={`sticky left-0 z-10 ${
                          isDarkMode ? "bg-gray-800" : "bg-white"
                        } ${
                          isDarkMode && "hover:bg-gray-700"
                        } px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap`}
                      >
                        {row.monthYear}
                      </td>
                      {row.days.map(
                        (dayPayments: CellPayment[], dayIndex: number) => (
                          <td
                            key={dayIndex}
                            className="px-2 sm:px-4 py-2 sm:py-4 text-center"
                          >
                            {dayPayments.length === 0 ? (
                              "-"
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                {dayPayments.map((payment) => (
                                  <span
                                    key={payment._id}
                                    className="inline-flex items-center gap-1 whitespace-nowrap"
                                  >
                                    ₹{payment.amountPaid.toFixed(0)}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeletePayment(payment._id)
                                      }
                                      title="Delete payment"
                                      className={`px-1 py-0.5 text-[10px] sm:text-xs font-bold rounded transition-colors
                                        ${
                                          isDarkMode
                                            ? "bg-red-900/60 text-red-300 hover:bg-red-800"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                        }`}
                                    >
                                      Del
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      )}
                      <td
                        className={`px-2 sm:px-6 py-2 sm:py-4 text-right font-bold ${
                          isDarkMode ? "text-orange-400" : "text-orange-600"
                        }`}
                      >
                        ₹{row.totalAmount.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className={`w-full lg:w-1/3 p-4 sm:p-6 rounded-lg shadow-sm border transition-colors duration-200
            ${
              isDarkMode
                ? "bg-gradient-to-br from-gray-800 to-gray-700 border-orange-800"
                : "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-4">
              <div>
                <h2
                  className={`text-lg sm:text-xl font-bold mb-2 sm:mb-4 ${
                    isDarkMode ? "text-orange-400" : "text-orange-700"
                  }`}
                >
                  Total Received Amount
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <p
                    className={`text-xl sm:text-2xl md:text-3xl font-bold ${
                      isDarkMode ? "text-orange-400" : "text-orange-800"
                    }`}
                  >
                    ₹{finalReceivedAmount.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteAllPayments}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold rounded transition-colors
                      ${
                        isDarkMode
                          ? "bg-red-900/60 text-red-300 hover:bg-red-800"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                  >
                    Delete All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAndReset}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold rounded transition-colors
                      ${
                        isDarkMode
                          ? "bg-amber-900/60 text-amber-300 hover:bg-amber-800"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }`}
                  >
                    Delete &amp; Reset
                  </button>
                </div>
              </div>

              <div>
                <h2
                  className={`text-lg sm:text-xl font-bold mb-2 sm:mb-4 ${
                    isDarkMode ? "text-orange-400" : "text-orange-700"
                  }`}
                >
                  Total To Be Paid
                </h2>
                <p
                  className={`text-xl sm:text-2xl md:text-3xl font-bold ${
                    isDarkMode ? "text-orange-400" : "text-orange-800"
                  }`}
                >
                  ₹{totalToBePaid.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AccountFinder
        onAccountSelect={handleAccountSelect}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />
    </div>
  );
}
