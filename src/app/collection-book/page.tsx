"use client";
import TimeDisplay from "@/ui/TimeDisplay";
import { Home } from "lucide-react";
import { Ubuntu } from "next/font/google";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface LoanDetails {
  _id: string;
  holderName: string;
  holderAddress: string;
  city: string;
  date: string; // Changed from loanDate to date
  mDate: string; // Added mDate field
  mAmount: number;
  instAmount: number;
  isDaily: boolean;
}

interface Payment {
  _id?: string;
  index: number;
  accountNo: string;
  amountPaid: number;
  paymentDate?: Date;
  lateAmount?: number;
  isDefaultAmount?: boolean;
}

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

const LoanManagement: React.FC = () => {
  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [existingPayments, setExistingPayments] = useState<Payment[]>([]);
  const router = useRouter();
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    column: "accountNo" | "amountPaid";
  }>({ row: 0, column: "accountNo" });
  const [payments, setPayments] = useState<Payment[]>([
    {
      index: 1,
      accountNo: "",
      amountPaid: 0,
      paymentDate: new Date(),
      lateAmount: 0,
      isDefaultAmount: false,
    },
  ]);
  const [currentRow, setCurrentRow] = useState(0);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [receivedAmounts, setReceivedAmounts] = useState<{
    [key: string]: number;
  }>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lateAmounts, setLateAmounts] = useState<{ [key: string]: number }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch payment history and calculate amounts
  const fetchPaymentHistory = async (accountNo: string) => {
    try {
      const response = await fetch(`/api/payment-history/${accountNo}`);
      const history = await response.json();

      // Calculate total received amount
      const totalReceived = history.reduce(
        (sum: number, payment: any) => sum + payment.amountPaid,
        0
      );

      setReceivedAmounts((prev) => ({
        ...prev,
        [accountNo]: totalReceived,
      }));

      return history;
    } catch (error) {
      console.error("Error fetching payment history:", error);
      return [];
    }
  };

  const formatPeriodType = (isDaily: boolean) => {
    return isDaily ? "Daily" : "Monthly";
  };

  // Calculate late amount based on payment history
  const calculateLateAmount = async (details: LoanDetails, accountNo: string) => {
    if (!details || !selectedDate) {
      return;
    }
    try {
      const paymentHistory = await fetchPaymentHistory(accountNo);
      const loanDate = new Date(details.date);
      const today = new Date(selectedDate);

      if (isNaN(loanDate.getTime())) {
        return;
      }

      let expectedPayments = 0;
      
      if (details.isDaily) {
        // Daily period calculation
        const daysDiff = Math.floor(
          (today.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysFromLoan = Math.max(0, daysDiff + 1);
        expectedPayments = daysFromLoan * details.instAmount;
      } else {
        // Monthly period calculation
        const monthsDiff = (today.getFullYear() - loanDate.getFullYear()) * 12 + 
          (today.getMonth() - loanDate.getMonth());
        
        // Add 1 if we've passed the date within the current month
        const dayInMonth = today.getDate() >= loanDate.getDate() ? 1 : 0;
        const monthsFromLoan = Math.max(0, monthsDiff + dayInMonth);
        expectedPayments = monthsFromLoan * details.instAmount;
      }

      // Calculate actual payments
      const sortedPayments = paymentHistory.sort(
        (a: any, b: any) =>
          new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      );

      const cumulativePayments = sortedPayments.reduce(
        (sum: number, payment: Payment) => {
          return sum + (payment.amountPaid || 0);
        },
        0
      );

      // Calculate late amount
      const lateAmount = expectedPayments - cumulativePayments;

      // Update states
      setLateAmounts((prev) => ({
        ...prev,
        [accountNo]: lateAmount,
      }));

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.accountNo === accountNo
            ? {
                ...payment,
                lateAmount: lateAmount,
                amountPaid: payment.isDefaultAmount
                  ? details.instAmount
                  : payment.amountPaid,
              }
            : payment
        )
      );
    } catch (error) {
      toast.error("Error calculating payment details");
    }
  };

  // Add this function near your other calculations
  const calculateTotalAmount = () => {
    return payments.reduce((sum, payment) => {
      return sum + (Number(payment.amountPaid) || 0);
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    const currentRow = selectedCell.row;
    const currentColumn = selectedCell.column;

    // Add delete key handling
    if (e.key === "Delete") {
      e.preventDefault();
      handleDeletePayment(currentRow);
      return;
    }

    if (
      [
        "Tab",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      e.preventDefault();

      let newRow = currentRow;
      let newColumn = currentColumn;

      switch (e.key) {
        case "ArrowDown":
          if (currentRow < payments.length - 1) {
            newRow = currentRow + 1;
            setSelectedCell({ ...selectedCell, row: newRow });
            inputRefs.current[`${currentColumn}-${newRow}`]?.focus();
          }
          break;

        case "ArrowUp":
          if (currentRow > 0) {
            newRow = currentRow - 1;
            setSelectedCell({ ...selectedCell, row: newRow });
            inputRefs.current[`${currentColumn}-${newRow}`]?.focus();
          }
          break;

        case "ArrowRight":
        case "Tab":
          if (!e.shiftKey && currentColumn === "accountNo") {
            newColumn = "amountPaid";
            setSelectedCell({ ...selectedCell, column: newColumn });
            inputRefs.current[`amountPaid-${currentRow}`]?.focus();
          }
          break;

        case "ArrowLeft":
          if (currentColumn === "amountPaid") {
            newColumn = "accountNo";
            setSelectedCell({ ...selectedCell, column: newColumn });
            inputRefs.current[`accountNo-${currentRow}`]?.focus();
          }
          break;

        case "Enter":
          // Check for duplicates before proceeding
          if (currentColumn === "accountNo") {
            const trimmedValue = payments[currentRow]?.accountNo.trim();

            // Check for duplicates in the payments array (excluding current index)
            const isDuplicate = payments.some(
              (payment, idx) =>
                idx !== currentRow && payment.accountNo === trimmedValue
            );

            if (isDuplicate) {
              toast.error(
                "This account number is already entered in another row."
              );
              // Keep focus on the current input field
              inputRefs.current[`accountNo-${currentRow}`]?.focus();
              return; // Stop further processing
            }

            // If no duplicate, move to the next column
            newColumn = "amountPaid";
            setSelectedCell({ ...selectedCell, column: newColumn });
            inputRefs.current[`amountPaid-${currentRow}`]?.focus();
          } else if (currentColumn === "amountPaid") {
            // Add a new payment row
            const newPayment = {
              index: payments.length + 1,
              accountNo: "",
              amountPaid: 0,
              paymentDate: selectedDate,
              lateAmount: 0,
              isDefaultAmount: false,
            };
            setPayments([...payments, newPayment]);
            newRow = payments.length;
            newColumn = "accountNo";
            setSelectedCell({ row: newRow, column: newColumn });
            inputRefs.current[`accountNo-${newRow}`]?.focus();
          }
          break;
      }

      // Update currentRow and fetch loan details if row changed
      if (newRow !== currentRow) {
        setCurrentRow(newRow);
        const accountNo = payments[newRow]?.accountNo;
        if (accountNo) {
          await fetchLoanDetails(accountNo);
        }
      }
    }
  };

  const handleAccountNoBlur = (index: number) => {
    const currentPayment = payments[index];
    const trimmedValue = currentPayment.accountNo.trim();

    if (!trimmedValue) return;

    // Check for duplicates in the payments array (excluding current index)
    const isDuplicate = payments.some(
      (payment, idx) => idx !== index && payment.accountNo === trimmedValue
    );

    if (isDuplicate) {
      toast.error("This account number is already entered in another row.");
      // Reset the account number for this payment
      const updatedPayments = [...payments];
      updatedPayments[index].accountNo = "";
      setPayments(updatedPayments);
    }
  };

  // Handle account number change
  const handleAccountNoChange = async (value: string, index: number) => {
    const trimmedValue = value.trim();

    // Create a copy of the current payments with the new value
    const updatedPayments = [...payments];
    updatedPayments[index] = {
      ...updatedPayments[index],
      accountNo: value,
    };

    // Update the state with the new value (even if trimmedValue is empty)
    setPayments(updatedPayments);
    setCurrentRow(index);

    // If the trimmed value is empty, no need to fetch loan details
    if (!trimmedValue) return;

    try {
      // Fetch loan details for the account number
      const loanData = await fetchLoanDetails(trimmedValue);
      if (!loanData) {
        toast.error("Account number does not exist.");
        // Reset the account number as it's invalid
        const resetPayments = [...updatedPayments];
        resetPayments[index].accountNo = "";
        setPayments(resetPayments);
        return;
      }

      // Update the payment with the installment amount
      const updatedWithAmount = [...updatedPayments];
      updatedWithAmount[index] = {
        ...updatedWithAmount[index],
        amountPaid: loanData.instAmount,
        isDefaultAmount: true,
      };
      setPayments(updatedWithAmount);
    } catch (error) {
      toast.error("Error validating account number.");
      // Reset the account number on error
      const resetPayments = [...updatedPayments];
      resetPayments[index].accountNo = "";
      setPayments(resetPayments);
    }
  };

  // Handle amount paid change
  const handleAmountPaidChange = (value: string, index: number) => {
    const amount = parseFloat(value) || 0;
    const updatedPayments = [...payments];
    updatedPayments[index] = {
      ...updatedPayments[index],
      amountPaid: amount,
      isDefaultAmount: false,
    };
    setPayments(updatedPayments);

    // Update received amounts - just set the new amount instead of adding
    const accountNo = updatedPayments[index].accountNo;
    if (accountNo) {
      // Calculate total received amount excluding current payment
      const totalFromOtherPayments = payments.reduce((sum, payment, idx) => {
        if (payment.accountNo === accountNo && idx !== index) {
          return sum + (payment.amountPaid || 0);
        }
        return sum;
      }, 0);

      // Set received amount as sum of other payments plus current amount
      setReceivedAmounts((prev) => ({
        ...prev,
        [accountNo]: totalFromOtherPayments + amount,
      }));
    }
  };

  // Calculate total to be paid
  const calculateTotalToBePaid = (accountNo: string) => {
    if (!loanDetails) return 0;

    const mAmount = loanDetails.mAmount || 0;
    const lateAmountValue = lateAmounts[accountNo] || 0;
    const receivedAmountValue = receivedAmounts[accountNo];

    return Math.max(0, mAmount - receivedAmountValue);
  };

  // Save payments
  const savePayments = async () => {
    if (!loanDetails) {
      alert("No loan selected");
      return;
    }

    const validPayments = payments.filter(
      (p) => p.accountNo && p.amountPaid > 0 && p.accountNo.trim() !== ""
    );

    if (validPayments.length === 0) {
      alert("No valid payments to save");
      return;
    }

    try {
      const paymentData = {
        loanId: loanDetails._id,
        paymentDate: selectedDate.toISOString(),
        payments: validPayments.map((p) => ({
          accountNo: p.accountNo.trim(),
          amountPaid: Number(p.amountPaid),
          lateAmount: lateAmounts[p.accountNo],
          remainingAmount: calculateTotalToBePaid(p.accountNo),
          _id: p._id,
        })),
      };

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save payments");
      }

      const responseData = await response.json();
      alert("Payments saved successfully");

      setPayments(
        responseData.payments.map((payment: Payment, index: number) => ({
          ...payment,
          index: index + 1,
        }))
      );

      await fetchExistingPayments();
    } catch (error) {
      alert("Error saving payments: " + (error as Error).message);
    }
  };

  // Delete payment
  const handleDeletePayment = async (index: number) => {
    const paymentToDelete = payments[index];

    if (confirm("Are you sure you want to delete this payment?")) {
      try {
        if (paymentToDelete._id) {
          const response = await fetch(`/api/payments/${paymentToDelete._id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            alert("Payment deleted successfully");

            const updatedPayments = payments.filter((_, i) => i !== index);
            const updatedReceivedAmounts: { [key: string]: number } = {
              ...receivedAmounts,
            };
            const updatedLateAmounts: { [key: string]: number } = {
              ...lateAmounts,
            };

            delete updatedReceivedAmounts[paymentToDelete.accountNo];
            delete updatedLateAmounts[paymentToDelete.accountNo];

            if (updatedPayments.length === 0) {
              setPayments([
                {
                  index: 1,
                  accountNo: "",
                  amountPaid: 0,
                  paymentDate: selectedDate,
                  lateAmount: 0,
                  isDefaultAmount: false,
                },
              ]);
              setLoanDetails(null);
              setReceivedAmounts({});
              setLateAmounts({});
            } else {
              setPayments(
                updatedPayments.map((payment, idx) => ({
                  ...payment,
                  index: idx + 1,
                }))
              );
              setReceivedAmounts(updatedReceivedAmounts);
              setLateAmounts(updatedLateAmounts);
            }
          } else {
            alert("Error deleting payment");
          }
        } else {
          // Handle local deletion
          const updatedPayments = payments.filter((_, i) => i !== index);
          if (updatedPayments.length === 0) {
            setPayments([
              {
                index: 1,
                accountNo: "",
                amountPaid: 0,
                paymentDate: selectedDate,
                lateAmount: 0,
                isDefaultAmount: false,
              },
            ]);
          } else {
            setPayments(
              updatedPayments.map((payment, idx) => ({
                ...payment,
                index: idx + 1,
              }))
            );
          }
          alert("Payment deleted successfully");
        }
      } catch (error) {
        alert("Error deleting payment: " + (error as Error).message);
      }
    }
  };

  // Use Effects

  useEffect(() => {
    if (loanDetails && payments[currentRow]?.accountNo) {
      calculateLateAmount(loanDetails, payments[currentRow].accountNo);
    }
  }, [selectedDate, loanDetails, payments[currentRow]?.accountNo]);

  useEffect(() => {
    if (loanDetails && payments[currentRow]?.accountNo) {
      calculateLateAmount(loanDetails, payments[currentRow].accountNo);
    }
  }, [payments[currentRow]?.amountPaid]);

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
    const currentPayment = payments[currentRow];
    if (currentPayment?.accountNo) {
      fetchLoanDetails(currentPayment.accountNo);
    }
  }, [currentRow]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleKeyboardSave = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && (e.altKey || e.metaKey)) {
        e.preventDefault();
        savePayments();
      }
    };

    window.addEventListener("keydown", handleKeyboardSave);
    return () => window.removeEventListener("keydown", handleKeyboardSave);
  }, [payments, loanDetails]);

  useEffect(() => {
    const tableBody = document.getElementById("payments-table-body");
    const selectedRow = document.getElementById(`payment-row-${currentRow}`);

    if (tableBody && selectedRow) {
      const rowHeight = selectedRow.offsetHeight;
      const scrollPosition = Math.max(
        0,
        currentRow * rowHeight - 2 * rowHeight
      );
      tableBody.scrollTop = scrollPosition;
    }
  }, [currentRow]);

  useEffect(() => {
    if (selectedCell.row === payments.length - 1) {
      inputRefs.current[`${selectedCell.column}-${selectedCell.row}`]?.focus();
    }
  }, [payments.length]);

  useEffect(() => {
    fetchExistingPayments();
  }, [selectedDate]);

  const formatDate = (date: Date) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  // Fetch existing payments
  const fetchExistingPayments = async () => {
    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      const url = new URL("/api/payments", window.location.origin);
      url.searchParams.set("date", formattedDate);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.payments && data.payments.length > 0) {
        const formattedPayments = data.payments.map(
          (payment: Payment, index: number) => ({
            ...payment,
            index: index + 1,
            paymentDate: new Date(payment.paymentDate || selectedDate),
            isDefaultAmount: false,
          })
        );

        setExistingPayments(formattedPayments);
        setPayments(formattedPayments);

        // Calculate received amounts by summing up all payments for each account
        const receivedAmountsMap: { [key: string]: number } = {};
        formattedPayments.forEach((payment: Payment) => {
          const accountNo = payment.accountNo;
          receivedAmountsMap[accountNo] =
            (receivedAmountsMap[accountNo] || 0) + (payment.amountPaid || 0);
        });
        setReceivedAmounts(receivedAmountsMap);

        if (formattedPayments[0].accountNo) {
          await fetchLoanDetails(formattedPayments[0].accountNo);
        }
      } else {
        resetState();
      }
    } catch (error) {
      toast.error("Error fetching existing payments");
      resetState();
    }
  };

  // Reset state to initial values
  const resetState = () => {
    setExistingPayments([]);
    setPayments([
      {
        index: 1,
        accountNo: "",
        amountPaid: 0,
        paymentDate: selectedDate,
        lateAmount: 0,
        isDefaultAmount: false,
      },
    ]);
    setLoanDetails(null);
    setReceivedAmounts({});
    setLateAmounts({});
  };

  // Fetch loan details
  const fetchLoanDetails = async (
    accountNo: string
  ): Promise<LoanDetails | null> => {
    try {
      const response = await fetch(`/api/loans/${accountNo}`);

      if (!response.ok) {
        throw new Error("Loan not found");
      }

      const data = await response.json();
      setLoanDetails(data);
      await calculateLateAmount(data, accountNo);
      return data;
    } catch (error) {
      toast.error("Error fetching loan details: " + (error as Error).message);
      setLoanDetails(null);
      return null;
    }
  };

  // Render component
  return (
    <div
      className={` ${ubuntu.className} min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 transition-colors`}
    >
      {/* Header Section */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-200/60 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <label className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Payment Date
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 
                text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all
                text-base font-medium shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    inputRefs.current[`accountNo-0`]?.focus();
                  }
                }}
              />
            </div>
            <div className="flex items-center space-x-4 gap-8 pl-28">
              <Link href="/">
                <div className="bg-white dark:bg-orange-200 rounded-full p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Home />
                </div>
              </Link>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C58403] via-[#EB6612] to-orange-600 ">
                Collection Book
              </h1>
              <Link
                href="/loan"
                className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
              >
                Loans
              </Link>
              <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                {formatDate(selectedDate)}
              </span>
            </div>
          </div>
          <TimeDisplay />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Loan Details Panel */}
        <div className="w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 pt-5 border border-gray-200/60 dark:border-gray-700">
            {loanDetails ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-4">
                  Loan Details
                </h2>
                <div className="space-y-4 ">
                  <div className="grid gap-2.5">
                    {[
                      { label: "Holder Name", value: loanDetails.holderName },
                      { label: "Address", value: loanDetails.holderAddress },

                      {
                        label: "Loan Date",
                        value: new Date(loanDetails.date)
                          .toLocaleDateString("en-GB")
                          .replace(/\//g, "-"),
                      },
                      {
                        label: "M. Date",
                        value: new Date(loanDetails.mDate)
                          .toLocaleDateString("en-GB")
                          .replace(/\//g, "-"),
                      },
                      {
                        label: "Period Type",
                        value: formatPeriodType(loanDetails.isDaily),
                      },
                      {
                        label: "Total Amount",
                        value: `₹${loanDetails.mAmount}`,
                      },
                      {
                        label: "Installment",
                        value: `₹${loanDetails.instAmount}`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between items-center "
                      >
                        <span className="text-base font-medium text-gray-600 dark:text-gray-400">
                          {item.label}
                        </span>
                        <span className="text-lg text-gray-900 dark:text-gray-100 font-semibold text-right uppercase">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {payments[currentRow]?.accountNo && (
                    <div className="mt-4 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-xl space-y-4 border border-orange-200 dark:border-orange-800">
                      <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-4">
                        Current Account Details
                      </h3>
                      <div className="grid gap-3">
                        {[
                          {
                            label: "Account No",
                            value: payments[currentRow].accountNo,
                          },
                          {
                            label: "Received Amount",
                            value: `₹${
                              receivedAmounts[payments[currentRow].accountNo] ||
                              0
                            }`,
                          },
                          {
                            label: "Late Amount",
                            value: `₹${
                              lateAmounts[payments[currentRow].accountNo]
                            }`,
                          },
                          {
                            label: "Total to be Paid",
                            value: `₹${calculateTotalToBePaid(
                              payments[currentRow].accountNo
                            )}`,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between items-center"
                          >
                            <span className="text-base font-medium text-orange-700 dark:text-orange-300">
                              {item.label}
                            </span>
                            <span className="text-lg text-orange-900 dark:text-orange-100 font-semibold">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-lg text-gray-500 dark:text-gray-400">
                  Select an account to view loan details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payments Table */}
        <div className="w-2/3 flex flex-col">
  <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700 overflow-hidden flex flex-col min-h-0 max-h-[61vh]">
    <div className="flex-1 overflow-y-auto relative">
      <table className="w-full overflow-y-auto">
        <thead className="sticky top-0 z-50 bg-orange-50 dark:bg-orange-950 shadow-md">
          <tr>
            {["Index", "Account No.", "Amount Paid", "Actions"].map((header) => (
              <th
                key={header}
                className="px-8 py-5 text-left text-base font-bold text-orange-800 dark:text-orange-200 uppercase tracking-wider bg-opacity-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 relative z-0">
          {payments.map((payment, index) => (
            <tr
              key={index}
              className={`${
                selectedCell.row === index
                  ? "bg-orange-100 dark:bg-orange-900"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
              } transition-colors`}
            >
              <td className="px-8 py-5 text-base font-medium text-gray-500 dark:text-gray-400 ">
                {payment.index}
              </td>
              <td className="px-8 py-4">
                <input
                  ref={(el) => {
                    inputRefs.current[`accountNo-${index}`] = el;
                  }}
                  type="text"
                  value={payment.accountNo}
                  onChange={(e) =>
                    handleAccountNoChange(e.target.value, index)
                  }
                  onBlur={() => handleAccountNoBlur(index)}
                  onKeyDown={handleKeyDown}
                  className={`w-full px-6 py-3 rounded-xl border text-base 
                  ${
                    selectedCell.row === index &&
                    selectedCell.column === "accountNo"
                      ? "border-orange-500 ring-2 ring-orange-500/20"
                      : "border-gray-300 dark:border-gray-600"
                  }
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                  transition-all`}
                  placeholder="Enter Account No."
                />
              </td>
              <td className="px-8 py-4">
                <input
                  ref={(el) => {
                    inputRefs.current[`amountPaid-${index}`] = el;
                  }}
                  type="number"
                  value={payment.amountPaid || ""}
                  onChange={(e) =>
                    handleAmountPaidChange(e.target.value, index)
                  }
                  onKeyDown={handleKeyDown}
                  className={`w-full px-6 py-3 rounded-xl border text-base
                  ${
                    selectedCell.row === index &&
                    selectedCell.column === "amountPaid"
                      ? "border-orange-500 ring-2 ring-orange-500/20"
                      : "border-gray-300 dark:border-gray-600"
                  }
                  ${
                    payment.isDefaultAmount
                      ? "text-orange-600 dark:text-orange-400"
                      : ""
                  }
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                  transition-all`}
                  placeholder="Enter Amount"
                />
              </td>
              <td className="px-8 py-4">
                <button
                  onClick={() => handleDeletePayment(index)}
                  className="px-6 py-3 text-base font-medium text-red-600 dark:text-red-400 
                  bg-red-50 dark:bg-red-900/20 rounded-xl
                  hover:bg-red-100 dark:hover:bg-red-900/30
                  focus:outline-none focus:ring-2 focus:ring-red-500/50
                  transition-colors"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>

  <div className="mt-6 mb-4 flex gap-32 text-lg items-center">
    <button
      onClick={savePayments}
      className="px-8 py-4 text-lg font-semibold text-white
      bg-orange-600 hover:bg-orange-700 rounded-xl
      shadow-lg shadow-orange-500/20
      focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
      dark:focus:ring-offset-gray-800
      transition-all"
    >
      Save All Payments (ALT + S)
    </button>
    <span className="font-bold border border-orange-400 rounded-lg p-4 w-60 text-center dark:text-white">
      {" "}
      Total :{" "}
      <span className="text-orange-500 ">
        ₹{calculateTotalAmount().toLocaleString("en-IN")}
      </span>
    </span>
  </div>
</div>
      </div>
    </div>
  );
};

export default LoanManagement;
