"use client";
import TimeDisplay from "@/ui/TimeDisplay";
import {Search } from "lucide-react";
import { Ubuntu } from "next/font/google";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AccountFinder from "@/components/accountFinder/AccountFinder";
import { useNavigationStore } from "@/store/NavigationStore";
import Image from "next/image";
import CustomAlertDialog from "@/components/customAlertDialog/CustomAlertDialog";

interface LoanDetails {
  _id: string;
  holderName: string;
  holderAddress: string;
  city: string;
  date: string; // Changed from loanDate to date
  mDate: string; // Added mDate field
  mAmount: number;
  name: string;
  instAmount: number;
  isDaily: boolean;
  telephone1: string;
  telephone2: string;
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
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [receivedAmounts, setReceivedAmounts] = useState<{
    [key: string]: number;
  }>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lateAmounts, setLateAmounts] = useState<{ [key: string]: number }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const firstAccountNoRef = useRef<HTMLInputElement | null>(null);
  const [selectedAccountNo, setSelectedAccountNo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [paymentHistoryCache, setPaymentHistoryCache] = useState<{
    [key: string]: Payment[];
  }>({});

  const [loanDetailsCache, setLoanDetailsCache] = useState<{
    [key: string]: LoanDetails;
  }>({});
  
  // Improved payment history fetching with caching
const fetchPaymentHistory = async (accountNo: string) => {
    try {
      // Return cached data if available
      if (paymentHistoryCache[accountNo]) {
        return paymentHistoryCache[accountNo];
      }
  
      const response = await fetch(`/api/payment-history/${accountNo}`);
      const history = await response.json();
  
      // Calculate total received amount
      const totalReceived = history.reduce(
        (sum: number, payment: Payment) => sum + payment.amountPaid,
        0
      );
  
      setReceivedAmounts((prev) => ({
        ...prev,
        [accountNo]: totalReceived,
      }));
  
      // Cache the fetched history
      setPaymentHistoryCache((prev) => ({
        ...prev,
        [accountNo]: history,
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

  // Add this function near your other calculations
  const calculateTotalAmount = () => {
    return payments.reduce((sum, payment) => {
      return sum + (Number(payment.amountPaid) || 0);
    }, 0);
  };

  const handleAmountPaidFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select(); // Select all text when input is focused
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
              setAlertMessage(
                "This account number is already entered in another row."
              );
              setAlertOpen(true);
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
          // Use cache if available
          if (loanDetailsCache[accountNo]) {
            setLoanDetails(loanDetailsCache[accountNo]);
          } else {
            await fetchLoanDetails(accountNo);
          }
        }
      }
    }
  };
  const handleAccountNoBlur = async (index: number) => {
    const currentPayment = payments[index];
    const trimmedValue = currentPayment.accountNo.trim();
  
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
      return;
    }
  
    // Validate the account number only if it's not empty
    if (trimmedValue) {
      try {
        // Check cache first
        let loanData = loanDetailsCache[trimmedValue];
        
        // If not in cache, fetch it
        if (!loanData) {
          const fetchedLoanData = await fetchLoanDetails(trimmedValue);
          if (fetchedLoanData) {
            loanData = fetchedLoanData;
          }
        }
        
        if (!loanData) {
          toast.error("Account number does not exist.");
          // Reset the account number as it's invalid
          const resetPayments = [...payments];
          resetPayments[index].accountNo = "";
          setPayments(resetPayments);
        }
      } catch (error) {
        console.error("Error validating account number.", error);
        // Reset the account number on error
        const resetPayments = [...payments];
        resetPayments[index].accountNo = "";
        setPayments(resetPayments);
      }
    }
  };
  

  // Handle account number change
  const handleAccountNoChange = async (value: string, index: number) => {
    const trimmedValue = value.trim();
  
    // Use functional update to ensure we're working with the latest state
    setPayments((prevPayments) => {
      const updatedPayments = [...prevPayments];
      updatedPayments[index] = {
        ...updatedPayments[index],
        accountNo: trimmedValue,
      };
      return updatedPayments;
    });
  
    // If the trimmed value is empty, stop further processing
    if (!trimmedValue) return;
  
    try {
      // Fetch loan details for the entered account number (will use cache if available)
      const loanData = await fetchLoanDetails(trimmedValue);
  
      if (loanData) {
        // Update the payment with the installment amount and default flag
        setPayments((prevPayments) => {
          const updatedPayments = [...prevPayments];
          updatedPayments[index] = {
            ...updatedPayments[index],
            amountPaid: loanData.instAmount,
            isDefaultAmount: true,
          };
          return updatedPayments;
        });
  
        // Fetch payment history if not already cached
        if (!paymentHistoryCache[trimmedValue]) {
          await fetchPaymentHistory(trimmedValue);
        }
      }
    } catch (error) {
      console.error("Error validating account number:", error);
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

    // Update received amounts
    const accountNo = updatedPayments[index].accountNo;
    if (accountNo) {
      const totalFromOtherPayments = payments.reduce((sum, payment, idx) => {
        if (payment.accountNo === accountNo && idx !== index) {
          return sum + (payment.amountPaid || 0);
        }
        return sum;
      }, 0);

      setReceivedAmounts((prev) => ({
        ...prev,
        [accountNo]: totalFromOtherPayments + amount,
      }));
    }
  };

  // Calculate total to be paid
  const calculateTotalToBePaid = (accountNo: string) => {
    if (!loanDetails) return 0;

    const mAmount = loanDetails.mAmount || 0; // Total loan amount
    const receivedAmountValue = receivedAmounts[accountNo] || 0; // Total amount received so far

    // Calculate the remaining amount to be paid (can be negative if overpaid)
    return mAmount - receivedAmountValue;
  };

  // Save payments
  const savePayments = async () => {
    if (!loanDetails) {
      // alert("No loan selected");
      setAlertMessage("No loan selected");
      setAlertOpen(true);
      return;
    }

    const validPayments = payments.filter(
      (p) => p.accountNo && p.amountPaid > 0 && p.accountNo.trim() !== ""
    );

    if (validPayments.length === 0) {
      setAlertMessage("No valid payments to save");
      setAlertOpen(true);
      return;
    }

    try {
      const paymentData = {
        loanId: loanDetails._id,
        paymentDate: formatDateForInput(selectedDate),
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
      setAlertMessage("Payment saved successfully");
      setAlertOpen(true);

      setPayments(
        responseData.payments.map((payment: Payment, index: number) => ({
          ...payment,
          index: index + 1,
        }))
      );

      await fetchExistingPayments();
      const lastIndex = responseData.payments.length - 1;
      setTimeout(() => {
        inputRefs.current[`accountNo-${lastIndex}`]?.focus();
        setSelectedCell({ row: lastIndex, column: "accountNo" });
      }, 0);
    } catch (error) {
      setAlertMessage("Error Saving Payments: " + (error as Error).message);
      setAlertOpen(true);
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
            setAlertMessage("Payment deleted successfully");
            setAlertOpen(true);
  
            const updatedPayments = payments.filter((_, i) => i !== index);
            const updatedReceivedAmounts = { ...receivedAmounts };
            const updatedLateAmounts = { ...lateAmounts };
            
            // Update payment history cache by removing the deleted payment
            const updatedCache = { ...paymentHistoryCache };
            if (updatedCache[paymentToDelete.accountNo]) {
              updatedCache[paymentToDelete.accountNo] = updatedCache[paymentToDelete.accountNo].filter(
                payment => payment._id !== paymentToDelete._id
              );
              
              // Recalculate received amount
              updatedReceivedAmounts[paymentToDelete.accountNo] = updatedCache[paymentToDelete.accountNo].reduce(
                (sum, payment) => sum + (payment.amountPaid || 0), 0
              );
            }
            
            setPaymentHistoryCache(updatedCache);
  
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
            setAlertMessage("error deleting loan");
            setAlertOpen(true);
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
          setAlertMessage("Payment deleted successfully");
          setAlertOpen(true);
        }
      } catch (error) {
        setAlertMessage("Error deleting payment: " + (error as Error).message);
        setAlertOpen(true);
      }
    }
  };

  // Use Effects

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
        setSelectedNavItem("Transaction", 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // Clear caches when date changes to ensure fresh data
    setLoanDetailsCache({});
    setPaymentHistoryCache({});
  }, [selectedDate]);
  

  useEffect(() => {
    const currentPayment = payments[currentRow];
    if (currentPayment?.accountNo && loanDetails) {
      // Only calculate late amount if account number and loan details are available
      calculateLateAmount(loanDetails, currentPayment.accountNo);
    }
  }, [
    selectedDate, // Only recalculate when date changes
    loanDetails, // Only recalculate when loan details change
    currentRow, // Only recalculate when selected row changes
  ]);

  useEffect(() => {
    setPaymentHistoryCache({});
  }, [selectedDate]);  

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
      // Use cache if available, otherwise fetch
      if (loanDetailsCache[currentPayment.accountNo]) {
        setLoanDetails(loanDetailsCache[currentPayment.accountNo]);
      } else {
        fetchLoanDetails(currentPayment.accountNo);
      }
    }
  }, [currentRow]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        router.push("/loan");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

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
  useEffect(() => {
    fetchExistingPayments();
  }, [selectedDate]);

  const fetchExistingPayments = async () => {
    try {
      const formattedDate = formatDateForInput(selectedDate);
      const url = new URL("/api/payments", window.location.origin);
      url.searchParams.set("date", formattedDate);
  
      const response = await fetch(url.toString());
      const data = await response.json();
  
      if (data.payments && data.payments.length > 0) {
        const formattedPayments = data.payments.map(
          (payment: Payment, index: number) => ({
            ...payment,
            index: index + 1,
            paymentDate:
              payment.paymentDate instanceof Date
                ? payment.paymentDate
                : typeof payment.paymentDate === "string"
                ? parseDateFromInput(payment.paymentDate)
                : parseDateFromInput(formatDateForInput(selectedDate)),
            isDefaultAmount: false,
          })
        );
  
        setExistingPayments(formattedPayments);
        setPayments(formattedPayments);
  
        // Calculate received amounts by summing up all payments for each account
        const receivedAmountsMap: { [key: string]: number } = {};
        const newPaymentHistoryCache: { [key: string]: Payment[] } = {};
        
        // Group payments by account number for caching
        formattedPayments.forEach((payment: Payment) => {
          const accountNo = payment.accountNo;
          
          // Update received amounts
          receivedAmountsMap[accountNo] =
            (receivedAmountsMap[accountNo] || 0) + (payment.amountPaid || 0);
          
          // Create or update payment history cache entry
          if (!newPaymentHistoryCache[accountNo]) {
            newPaymentHistoryCache[accountNo] = [];
          }
          newPaymentHistoryCache[accountNo].push(payment);
        });
        
        setReceivedAmounts(receivedAmountsMap);
        
        // Update cache with grouped payments
        setPaymentHistoryCache(newPaymentHistoryCache);
  
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault(); // Prevent default behavior

        // Select the full date in the ReactDatePicker input
        const datePickerInput = document.querySelector(
          'input[placeholder="dd-MM-yyyy"]'
        ) as HTMLInputElement | null;

        if (datePickerInput) {
          datePickerInput.select(); // Select the full date text
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Add a new function to handle manual date input formatting
  const handleManualDateEntry = (inputValue: string): Date | null => {
    if (inputValue.length === 8) {
      // Parse the input value assuming it's in ddmmyyyy format
      const day = inputValue.substring(0, 2);
      const month = inputValue.substring(2, 4);
      const year = inputValue.substring(4, 8);

      // Create a Date object
      const parsedDate = new Date(`${year}-${month}-${day}`);

      // Validate the parsed date
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate); // Update the state with the formatted date
        return parsedDate;
      }
    }

    const today = getTodayDate();
    setSelectedDate(today);
    return null; // Return null if parsing fails
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
  // Clear caches
  setPaymentHistoryCache({});
  setLoanDetailsCache({});
};


  const calculateLateAmount = async (
    details: LoanDetails,
    accountNo: string
  ) => {
    if (!details || !selectedDate || !accountNo) {
      return;
    }
  
    try {
      // Only fetch payment history if not in cache
      const paymentHistory = paymentHistoryCache[accountNo] || 
                            await fetchPaymentHistory(accountNo);
      
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
        const monthsDiff =
          (today.getFullYear() - loanDate.getFullYear()) * 12 +
          (today.getMonth() - loanDate.getMonth());
  
        // Add 1 if we've passed the date within the current month
        const dayInMonth = today.getDate() >= loanDate.getDate() ? 1 : 0;
        const monthsFromLoan = Math.max(0, monthsDiff + dayInMonth);
        expectedPayments = monthsFromLoan * details.instAmount;
      }
  
      // Calculate actual payments
      const sortedPayments = paymentHistory.sort(
        (a: Payment, b: Payment) =>
          new Date(a.paymentDate as Date).getTime() -
          new Date(b.paymentDate as Date).getTime()
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
      console.error("Error calculating payment details", error);
    }
  };

  
  
  // Improved loan details fetching with caching
  const fetchLoanDetails = async (
    accountNo: string
  ): Promise<LoanDetails | null> => {
    try {
      // Check cache first
      if (loanDetailsCache[accountNo]) {
        // Use cached loan details
        setLoanDetails(loanDetailsCache[accountNo]);
        return loanDetailsCache[accountNo];
      }
  
      const response = await fetch(`/api/loans/${accountNo}`);
  
      if (!response.ok) {
        throw new Error("Loan not found");
      }
  
      const data = await response.json();
      
      // Update cache and state
      setLoanDetailsCache(prev => ({
        ...prev,
        [accountNo]: data
      }));
      setLoanDetails(data);
      
      return data;
    } catch (error) {
      toast.error("Error fetching loan details: " + (error as Error).message);
      setLoanDetails(null);
      return null;
    }
  };
  

  const handleRowClick = async (index: number, accountNo: string) => {
    if (accountNo) {
      setCurrentRow(index);
      setSelectedCell({ row: index, column: "accountNo" });
      
      // Check cache first
      if (loanDetailsCache[accountNo]) {
        setLoanDetails(loanDetailsCache[accountNo]);
      } else {
        await fetchLoanDetails(accountNo);
      }
    }
  };

  // Utility function to parse date from input
  const parseDateFromInput = (dateString: string): Date => {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Months are 0-based in JavaScript
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(); // Fallback to current date if parsing fails
  };

  // Utility function to format date for input
  const formatDateForInput = (date: Date): string => {
    try {
      if (!isValidDate(date)) return new Date().toISOString().split("T")[0];

      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return new Date().toISOString().split("T")[0];
    }
  };

  const isValidDate = (date: Date): boolean => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Render component
  return (
    <div
      className={`${ubuntu.className} min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 md:p-4 transition-colors`}
    >
      {/* Header Section */}
      <div className="mb-4 md:mb-8 bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-gray-200/60 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col lg:flex-row md:items-start lg:items-center gap-4 md:gap-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              <label className="text-base items-center flex gap-2 md:text-lg font-semibold text-gray-700 dark:text-gray-300">
                Payment Date
                <span
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 p-2 bg-orange-500 hover:bg-orange-600 lg:hidden text-white rounded-full transition-colors"
                >
                  <Search size={12} />
                </span>
              </label>
              <ReactDatePicker
                selected={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                dateFormat="dd-MM-yyyy"
                placeholderText="dd-MM-yyyy"
                className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 rounded-xl border text-lg md:text-xl font-semibold"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const inputValue = (
                      e.target as HTMLInputElement
                    ).value.replace(/\D/g, "");
                    const parsedDate = handleManualDateEntry(inputValue);
                    if (parsedDate) {
                      firstAccountNoRef.current?.focus();
                    } else {
                      toast.error("Invalid date format. Please use DDMMYYYY.");
                    }
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8 lg:pl-28">
              {isDarkMode ? (
                <Image
                  src="/GFLogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-8 lg:w-10 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                ></Image>
              ) : (
                <Image
                  src="/lightlogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-8 lg:w-10 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                ></Image>
              )}
              <h1 className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C58403] via-[#EB6612] to-orange-600">
                Collection Book
              </h1>
              <Link
                href="/loan"
                className="px-4 md:px-6 py-2 md:py-3 bg-orange-600 text-white rounded-xl text-sm md:text-base hover:bg-orange-700 transition-colors"
              >
                Loans
              </Link>
            </div>
          </div>
          <div className="lg:flex justify-between items-center hidden lg:gap-12 ">
            <span className="text-base md:text-lg font-medium text-gray-600 dark:text-gray-400">
              {formatDate(selectedDate)}
            </span>
            <TimeDisplay />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        {/* Loan Details Panel */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 pt-4 md:pt-5 border border-gray-200/60 dark:border-gray-700">
          <span className="hidden"> ${existingPayments.length} ${selectedAccountNo} </span>
            {loanDetails ? (
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Loan Details
                </h2>
                <div className="space-y-3 md:space-y-3">
                  <div className="grid gap-2 md:gap-2">
                    {[
                      { label: "Holder Name", value: loanDetails.holderName },
                      { label: "Name", value: loanDetails.name },
                      { label: "Address", value: loanDetails.holderAddress },
                      { label: "Telephone 1", value: loanDetails.telephone1 },
                      { label: "Telephone 2", value: loanDetails.telephone2 },
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
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm md:text-base font-medium text-orange-600">
                          {item.label}
                        </span>
                        <span className="text-base md:text-lg text-gray-900 dark:text-gray-100 font-semibold text-right uppercase">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {payments[currentRow]?.accountNo && (
                    <div className="mt-4 p-4 md:p-6 bg-orange-50 dark:bg-orange-900/10 rounded-xl space-y-3 md:space-y-4 border border-orange-200 dark:border-orange-800">
                      <div className="grid gap-2 md:gap-3">
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
                            <span className="text-sm md:text-base font-medium text-orange-700 dark:text-orange-300">
                              {item.label}
                            </span>
                            <span className="text-base md:text-lg text-orange-900 dark:text-orange-100 font-semibold">
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
              <div className="h-48 md:h-64 flex items-center justify-center">
                <p className="text-base md:text-lg text-gray-500 dark:text-gray-400">
                  Select an account to view loan details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payments Table */}
        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700 overflow-hidden flex flex-col min-h-0 max-h-[61vh]">
            <div className="flex-1 overflow-x-auto overflow-y-auto relative">
              <table className="w-full min-w-[640px]">
                <thead className="sticky top-0 z-50 bg-orange-50 dark:bg-orange-950 shadow-md">
                  <tr>
                    {["Index", "Account No.", "Amount Paid", "Actions"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-4 md:px-8 py-4 md:py-5 text-left text-sm md:text-base font-bold text-orange-800 dark:text-orange-200 uppercase tracking-wider bg-opacity-100"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 relative z-0">
                  {payments.map((payment, index) => (
                    <tr
                      key={index}
                      id={`payment-row-${index}`}
                      onClick={() => handleRowClick(index, payment.accountNo)}
                      className={`${
                        selectedCell.row === index
                          ? "bg-orange-200 dark:bg-orange-900"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      } transition-colors`}
                    >
                      <td className="px-4 md:px-8 py-3 md:py-5 text-base md:text-xl font-bold text-gray-500 dark:text-gray-400">
                        {payment.index}
                      </td>
                      <td className="px-4 md:px-8 py-3 md:py-4">
                        <input
                          ref={(el) => {
                            inputRefs.current[`accountNo-${index}`] = el;
                            if (index === 0) firstAccountNoRef.current = el;
                          }}
                          type="number"
                          value={payment.accountNo}
                          onChange={(e) =>
                            handleAccountNoChange(e.target.value, index)
                          }
                          onBlur={() => handleAccountNoBlur(index)}
                          onKeyDown={handleKeyDown}
                          className={`w-full px-3 md:px-6 py-2 md:py-3 rounded-xl border text-base md:text-xl font-bold 
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
                      <td className="px-4 md:px-8 py-3 md:py-4">
                        <input
                          ref={(el) => {
                            inputRefs.current[`amountPaid-${index}`] = el;
                          }}
                          type="number"
                          value={payment.amountPaid || ""}
                          onChange={(e) =>
                            handleAmountPaidChange(e.target.value, index)
                          }
                          onFocus={handleAmountPaidFocus}
                          onKeyDown={handleKeyDown}
                          className={`w-full px-3 md:px-6 py-2 md:py-3 rounded-xl border text-base md:text-xl font-bold
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
                      <td className="px-4 md:px-8 py-3 md:py-4">
                        <button
                          onClick={() => handleDeletePayment(index)}
                          className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium text-red-600 dark:text-red-400 
                            bg-red-50 dark:bg-red-900 rounded-xl
                            hover:bg-red-100 dark:hover:bg-red-900
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

          {/* Footer Section */}
          <div className="mt-4 md:mt-6 mb-2 md:mb-4 flex flex-col md:flex-row justify-between md:gap-32 text-base md:text-lg items-center gap-4">
            <button
              onClick={savePayments}
              className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all"
            >
              Save All Payments (ALT + S)
            </button>
            <span className="font-bold border border-orange-400 rounded-lg p-3 md:p-4 w-full md:w-60 text-center dark:text-white text-xl md:text-2xl">
              Total:{" "}
              <span className="text-orange-500">
                ₹{calculateTotalAmount().toLocaleString("en-IN")}
              </span>
            </span>
          </div>
        </div>
      </div>

      <AccountFinder
        onAccountSelect={(accountNo) => {
          setSelectedAccountNo(accountNo);

          handleAccountNoChange(accountNo, currentRow); // Populate the current row's accountNo
          setTimeout(() => {
            inputRefs.current[`accountNo-${currentRow}`]?.focus();
          }, 0);
        }}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />
      <CustomAlertDialog
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Alert"
        description={alertMessage}
      />
    </div>
  );
};

export default LoanManagement;
