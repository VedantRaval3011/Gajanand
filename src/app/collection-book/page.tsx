"use client";
import TimeDisplay from "@/ui/TimeDisplay";
import { Search } from "lucide-react";
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
  date: string;
  mDate: string;
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
  paymentTime?: string;
  isDefaultAmount?: boolean;
}

const ubuntu = Ubuntu({
  weight: "400",
  subsets: ["latin"],
});

const LoanManagement: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [existingPayments, setExistingPayments] = useState<Payment[]>([]);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    column: "accountNo" | "amountPaid" | "paymentTime";
  }>({ row: 0, column: "accountNo" });
  const [payments, setPayments] = useState<Payment[]>([
    {
      index: 1,
      accountNo: "",
      amountPaid: 0,
      paymentDate: new Date(),
      lateAmount: 0,
      isDefaultAmount: true,
    },
  ]);

  const lastRowRef = useRef<HTMLInputElement | null>(null);
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
  const [isSaved, setIsSaved] = useState({
    status: false,
    accounts: [] as string[],
    currentAccount: "",
  });
  const [paymentHistoryCache, setPaymentHistoryCache] = useState<{
    [key: string]: Payment[];
  }>({});
  const [loanDetailsCache, setLoanDetailsCache] = useState<{
    [key: string]: LoanDetails;
  }>({});

  const handlePaymentTimeChange = (value: string, index: number) => {
    setPayments((prevPayments) => {
      const updatedPayments = [...prevPayments];
      updatedPayments[index] = {
        ...updatedPayments[index],
        paymentTime: value,
      };
      return updatedPayments;
    });
  };

  const fetchPaymentHistory = async (accountNo: string) => {
    try {
      if (paymentHistoryCache[accountNo]) {
        return paymentHistoryCache[accountNo];
      }

      const response = await fetch(`/api/payment-history/${accountNo}`);
      const history = await response.json();

      const totalReceived = history.reduce(
        (sum: number, payment: Payment) => sum + (payment.amountPaid || 0),
        0
      );

      setReceivedAmounts((prev) => ({
        ...prev,
        [accountNo]: totalReceived,
      }));

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

  const calculateTotalAmount = () => {
    return payments.reduce((sum, payment) => {
      return sum + (Number(payment.amountPaid) || 0);
    }, 0);
  };

  const handleAmountPaidFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    const currentRow = selectedCell.row;
    const currentColumn = selectedCell.column;

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
          if (!e.shiftKey) {
            if (currentColumn === "accountNo") {
              newColumn = "amountPaid";
            } else if (currentColumn === "amountPaid") {
              newColumn = "paymentTime";
            }
            setSelectedCell({ row: currentRow, column: newColumn });
            setTimeout(() => {
              inputRefs.current[`${newColumn}-${currentRow}`]?.focus();
            }, 0);
          }
          break;

        case "ArrowLeft":
          if (currentColumn === "paymentTime") {
            newColumn = "amountPaid";
          } else if (currentColumn === "amountPaid") {
            newColumn = "accountNo";
          }
          setSelectedCell({ row: currentRow, column: newColumn });
          setTimeout(() => {
            inputRefs.current[`${newColumn}-${currentRow}`]?.focus();
          }, 0);
          break;

        case "Enter":
          if (currentColumn === "paymentTime") {
            const newPayment = {
              index: payments.length + 1,
              accountNo: "",
              amountPaid: 0,
              paymentDate: selectedDate,
              paymentTime: new Date().toLocaleTimeString("en-US", {
                hour12: false,
              }),
              lateAmount: 0,
              isDefaultAmount: false,
            };
            setPayments([...payments, newPayment]);
            newRow = payments.length;
            newColumn = "accountNo";
            setSelectedCell({ row: newRow, column: newColumn });
            setTimeout(() => {
              inputRefs.current[`accountNo-${newRow}`]?.focus();
            }, 0);
          }
          if (currentColumn === "accountNo") {
            const trimmedValue = payments[currentRow]?.accountNo.trim();

            const isDuplicate = payments.some(
              (payment, idx) =>
                idx !== currentRow && payment.accountNo === trimmedValue
            );

            if (isDuplicate) {
              alert("Duplicate accountNos are not allowed");
              setPayments((prevPayments) => {
                const updatedPayments = [...prevPayments];
                updatedPayments[currentRow].accountNo = "";
                return updatedPayments;
              });
              inputRefs.current[`accountNo-${currentRow}`]?.focus();
              return;
            }

            newColumn = "amountPaid";
            setSelectedCell({ row: currentRow, column: newColumn });
            setTimeout(() => {
              inputRefs.current[`amountPaid-${currentRow}`]?.focus();
            }, 0);
          } else if (currentColumn === "amountPaid") {
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
            setTimeout(() => {
              inputRefs.current[`accountNo-${newRow}`]?.focus();
            }, 0);
          }
          break;
      }

      if (newRow !== currentRow) {
        setCurrentRow(newRow);
        const accountNo = payments[newRow]?.accountNo;
        if (accountNo) {
          if (loanDetailsCache[accountNo]) {
            setLoanDetails(loanDetailsCache[accountNo]);
          } else {
            // Don't await here, let it happen in background
            fetchLoanDetails(accountNo).catch(console.error);
          }
        }
      }
    }
  };

  const handleAccountNoBlur = async (index: number) => {
    const currentPayment = payments[index];
    const trimmedValue = currentPayment.accountNo.trim();

    // Update with trimmed value
    setPayments((prevPayments) => {
      const updatedPayments = [...prevPayments];
      updatedPayments[index].accountNo = trimmedValue;
      return updatedPayments;
    });

    if (!trimmedValue) {
      return;
    }

    const isDuplicate = payments.some(
      (payment, idx) => idx !== index && payment.accountNo === trimmedValue
    );

    if (isDuplicate) {
      toast.error("This account number is already entered in another row.");
      const updatedPayments = [...payments];
      updatedPayments[index].accountNo = "";
      setPayments(updatedPayments);
      return;
    }

    try {
      setIsLoading(true);
      let loanData = loanDetailsCache[trimmedValue];

      // Instead of immediately updating global state, work with a local variable
      if (!loanData) {
        try {
          const response = await fetch(`/api/loans/${trimmedValue}`);
          if (!response.ok) {
            throw new Error("Loan not found");
          }
          loanData = await response.json();

          // Update cache without updating focus
          setLoanDetailsCache((prev) => ({
            ...prev,
            [trimmedValue]: loanData,
          }));

          // Update loan details separately
          setLoanDetails(loanData);
        } catch (error) {
          toast.error(
            "Error fetching loan details: " + (error as Error).message
          );
          const resetPayments = [...payments];
          resetPayments[index].accountNo = "";
          setPayments(resetPayments);
          return;
        }
      }

      if (loanData) {
        // Update amount paid only if it's still the default or zero
        setPayments((prevPayments) => {
          const updatedPayments = [...prevPayments];
          const currentPayment = updatedPayments[index];

          if (
            currentPayment.isDefaultAmount ||
            currentPayment.amountPaid === 0
          ) {
            updatedPayments[index] = {
              ...currentPayment,
              amountPaid: loanData.instAmount,
              isDefaultAmount: true,
            };
          }
          return updatedPayments;
        });

        if (!paymentHistoryCache[trimmedValue]) {
          await fetchPaymentHistory(trimmedValue);
        }

        // Important: Move focus to amount paid after processing account number
        setTimeout(() => {
          setSelectedCell({ row: index, column: "amountPaid" });
          inputRefs.current[`amountPaid-${index}`]?.focus();
        }, 100);
      } else {
        toast.error("Account number does not exist.");
        const resetPayments = [...payments];
        resetPayments[index].accountNo = "";
        setPayments(resetPayments);
      }
    } catch (error) {
      console.error("Error validating account number.", error);
      const resetPayments = [...payments];
      resetPayments[index].accountNo = "";
      setPayments(resetPayments);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountNoChange = (value: string, index: number) => {
    const trimmedValue = value.trim();
    const payment = payments[index];

    // If the row is saved (has an _id or accountNo is in isSaved.accounts), prevent changes
    if (payment._id || isSaved.accounts.includes(payment.accountNo)) {
      return; // Do not allow modification
    }

    // Always update the account number input immediately without triggering loading state
    setPayments((prevPayments) => {
      const updatedPayments = [...prevPayments];
      updatedPayments[index] = {
        ...updatedPayments[index],
        accountNo: value, // Use the original value to maintain cursor position
      };
      return updatedPayments;
    });

    // Don't do anything else while typing - we'll fetch details on blur instead
  };

  const handleAmountPaidChange = (value: string, index: number) => {
    const amount = parseFloat(value) || 0;
    setPayments((prevPayments) => {
      const updatedPayments = [...prevPayments];
      const currentPayment = updatedPayments[index];
      updatedPayments[index] = {
        ...updatedPayments[index],
        amountPaid: amount,
        isDefaultAmount: false,
      };

      const accountNo = currentPayment.accountNo;
      if (accountNo) {
        const previousReceived = receivedAmounts[accountNo] || 0;
        setReceivedAmounts((prev) => ({
          ...prev,
          [accountNo]:
            previousReceived - (currentPayment.amountPaid || 0) + amount,
        }));
      }

      return updatedPayments;
    });
  };

  const calculateTotalToBePaid = (accountNo: string) => {
    if (!loanDetails) return 0;
    const mAmount = loanDetails.mAmount || 0;
    const receivedAmountValue = receivedAmounts[accountNo] || 0;
    return mAmount - receivedAmountValue;
  };

  const savePayments = async () => {
    if (isSaving) return;

    if (!loanDetails) {
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

    const accountNoSet = new Set<string>();
    const duplicates: string[] = [];
    const hasDuplicates = validPayments.some((payment) => {
      const trimmedAccountNo = payment.accountNo.trim();
      if (accountNoSet.has(trimmedAccountNo)) {
        duplicates.push(trimmedAccountNo);
        return true;
      }
      accountNoSet.add(trimmedAccountNo);
      return false;
    });

    if (hasDuplicates) {
      alert("Duplicate account Nos are not allowed");
      return;
    }

    setIsSaving(true);
    try {
      const paymentData = {
        loanId: loanDetails._id,
        paymentDate: formatDateForInput(selectedDate),
        payments: validPayments.map((p) => {
          const previousReceived = receivedAmounts[p.accountNo] || 0;
          const newReceived = previousReceived + Number(p.amountPaid);
          return {
            accountNo: p.accountNo.trim(),
            amountPaid: Number(p.amountPaid),
            paymentDate: p.paymentDate,
            paymentTime:
              p.paymentTime ||
              new Date().toLocaleTimeString("en-US", { hour12: false }), // Include paymentTime
            lateAmount: lateAmounts[p.accountNo] || 0,
            remainingAmount: loanDetails.mAmount - newReceived,
            _id: p._id,
          };
        }),
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

      const updatedPayments = responseData.payments.map(
        (payment: Payment, index: number) => ({
          ...payment,
          index: index + 1,
          paymentDate:
            payment.paymentDate instanceof Date
              ? payment.paymentDate
              : typeof payment.paymentDate === "string"
              ? parseDateFromInput(payment.paymentDate)
              : selectedDate,
          isDefaultAmount: false,
        })
      );
      setPayments(updatedPayments);
      setExistingPayments(updatedPayments);

      setPaymentHistoryCache({});

      const accountsToRefresh: string[] = updatedPayments.map(
        (p: Payment) => p.accountNo
      );
      const currentAccountNo = updatedPayments[currentRow]?.accountNo || "";

      // Update isSaved to mark these accounts as saved
      setIsSaved({
        status: true,
        accounts: accountsToRefresh,
        currentAccount: currentAccountNo,
      });

      const lastIndex = updatedPayments.length - 1;
      setTimeout(() => {
        inputRefs.current[`accountNo-${lastIndex}`]?.focus();
        setSelectedCell({ row: lastIndex, column: "accountNo" });
      }, 0);
    } catch (error) {
      setAlertMessage("Error Saving Payments: " + (error as Error).message);
      setAlertOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isSaved.status) {
      const syncValues = async () => {
        const newReceivedAmounts = { ...receivedAmounts };
        const newLateAmounts = { ...lateAmounts };
        const newLoanDetailsCache = { ...loanDetailsCache };

        await Promise.all(
          isSaved.accounts.map(async (accountNo) => {
            if (!accountNo) return;

            const history = await fetchPaymentHistory(accountNo);
            const totalReceived = history.reduce(
              (sum: number, p: Payment) => sum + (p.amountPaid || 0),
              0
            );
            newReceivedAmounts[accountNo] = totalReceived;

            const loanDetailsData = await fetchLoanDetails(accountNo);
            if (loanDetailsData) {
              newLoanDetailsCache[accountNo] = loanDetailsData;

              const loanDate = new Date(loanDetailsData.date);
              const today = new Date(selectedDate);

              if (!isNaN(loanDate.getTime())) {
                let expectedPayments = 0;

                if (loanDetailsData.isDaily) {
                  const daysDiff = Math.floor(
                    (today.getTime() - loanDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  const daysFromLoan = Math.max(0, daysDiff + 1);
                  expectedPayments = daysFromLoan * loanDetailsData.instAmount;
                } else {
                  const monthsDiff =
                    (today.getFullYear() - loanDate.getFullYear()) * 12 +
                    (today.getMonth() - loanDate.getMonth());
                  const dayInMonth =
                    today.getDate() >= loanDate.getDate() ? 1 : 0;
                  const monthsFromLoan = Math.max(0, monthsDiff + dayInMonth);
                  expectedPayments =
                    monthsFromLoan * loanDetailsData.instAmount;
                }

                const lateAmount = expectedPayments - totalReceived;
                newLateAmounts[accountNo] = lateAmount;

                setPayments((prevPayments) =>
                  prevPayments.map((payment) =>
                    payment.accountNo === accountNo
                      ? { ...payment, lateAmount }
                      : payment
                  )
                );
              }
            }
          })
        );

        setReceivedAmounts(newReceivedAmounts);
        setLateAmounts(newLateAmounts);
        setLoanDetailsCache(newLoanDetailsCache);

        if (
          isSaved.currentAccount &&
          newLoanDetailsCache[isSaved.currentAccount]
        ) {
          setLoanDetails(newLoanDetailsCache[isSaved.currentAccount]);
        }

        setIsSaved({ status: false, accounts: [], currentAccount: "" });
      };

      syncValues();
    }
  }, [isSaved.status, selectedDate]);

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

            const updatedCache = { ...paymentHistoryCache };
            if (updatedCache[paymentToDelete.accountNo]) {
              updatedCache[paymentToDelete.accountNo] = updatedCache[
                paymentToDelete.accountNo
              ].filter((payment) => payment._id !== paymentToDelete._id);

              updatedReceivedAmounts[paymentToDelete.accountNo] = updatedCache[
                paymentToDelete.accountNo
              ].reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
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
    setLoanDetailsCache({});
    setPaymentHistoryCache({});
  }, [selectedDate]);

  useEffect(() => {
    const currentPayment = payments[currentRow];
    if (currentPayment?.accountNo && loanDetails) {
      calculateLateAmount(loanDetails, currentPayment.accountNo);
    }
  }, [selectedDate, loanDetails, currentRow]);

  useEffect(() => {
    setPaymentHistoryCache({});
  }, [selectedDate]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    const currentPayment = payments[currentRow];
    if (currentPayment?.accountNo) {
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

  const fetchExistingPayments = async () => {
    try {
      setIsLoading(true);
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

        // Add a new empty row after existing payments
        const newPayment = {
          index: formattedPayments.length + 1,
          accountNo: "",
          amountPaid: 0,
          paymentDate: selectedDate,
          lateAmount: 0,
          isDefaultAmount: false,
        };
        const updatedPayments = [...formattedPayments, newPayment];

        setExistingPayments(formattedPayments);
        setPayments(updatedPayments);

        const receivedAmountsMap: { [key: string]: number } = {};
        await Promise.all(
          formattedPayments.map(async (payment: Payment) => {
            const history = await fetchPaymentHistory(payment.accountNo);
            receivedAmountsMap[payment.accountNo] = history.reduce(
              (sum: number, p: Payment) => sum + (p.amountPaid || 0),
              0
            );
          })
        );

        setReceivedAmounts(receivedAmountsMap);

        if (formattedPayments[0].accountNo) {
          await fetchLoanDetails(formattedPayments[0].accountNo);
        }

        // Set focus to the new row
        setSelectedCell({
          row: updatedPayments.length - 1,
          column: "accountNo",
        });
      } else {
        resetState();
        // After reset, ensure a new row is added and focused
        const newPayment = {
          index: 1,
          accountNo: "",
          amountPaid: 0,
          paymentDate: selectedDate,
          lateAmount: 0,
          isDefaultAmount: false,
        };
        setPayments([newPayment]);
        setSelectedCell({ row: 0, column: "accountNo" });
      }
    } catch {
      alert("Error fetching existing payments");
      resetState();
      const newPayment = {
        index: 1,
        accountNo: "",
        amountPaid: 0,
        paymentDate: selectedDate,
        lateAmount: 0,
        isDefaultAmount: false,
      };
      setPayments([newPayment]);
      setSelectedCell({ row: 0, column: "accountNo" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && payments.length > 0) {
      const lastIndex = payments.length - 1;
      setCurrentRow(lastIndex);
      setSelectedCell({ row: lastIndex, column: "accountNo" }); // Ensure selectedCell is updated
      inputRefs.current[`accountNo-${lastIndex}`]?.focus();
    }
  }, [isLoading, payments.length]); // Add payments.length as a dependency

  // Effect to fetch payments when date changes
  useEffect(() => {
    fetchExistingPayments();
  }, [selectedDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const datePickerInput = document.querySelector(
          'input[placeholder="dd-MM-yyyy"]'
        ) as HTMLInputElement | null;
        if (datePickerInput) {
          datePickerInput.select();
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

  const handleManualDateEntry = (inputValue: string): Date | null => {
    if (inputValue.length === 8) {
      const day = inputValue.substring(0, 2);
      const month = inputValue.substring(2, 4);
      const year = inputValue.substring(4, 8);
      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
        return parsedDate;
      }
    }
    const today = getTodayDate();
    setSelectedDate(today);
    return null;
  };

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
      const paymentHistory =
        paymentHistoryCache[accountNo] ||
        (await fetchPaymentHistory(accountNo));
      const loanDate = new Date(details.date);
      const today = new Date(selectedDate);

      if (isNaN(loanDate.getTime())) {
        return;
      }

      let expectedPayments = 0;

      if (details.isDaily) {
        const daysDiff = Math.floor(
          (today.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysFromLoan = Math.max(0, daysDiff + 1);
        expectedPayments = daysFromLoan * details.instAmount;
      } else {
        const monthsDiff =
          (today.getFullYear() - loanDate.getFullYear()) * 12 +
          (today.getMonth() - loanDate.getMonth());
        const dayInMonth = today.getDate() >= loanDate.getDate() ? 1 : 0;
        const monthsFromLoan = Math.max(0, monthsDiff + dayInMonth);
        expectedPayments = monthsFromLoan * details.instAmount;
      }

      const sortedPayments = paymentHistory.sort(
        (a: Payment, b: Payment) =>
          new Date(a.paymentDate as Date).getTime() -
          new Date(b.paymentDate as Date).getTime()
      );

      const cumulativePayments = sortedPayments.reduce(
        (sum: number, payment: Payment) => sum + (payment.amountPaid || 0),
        0
      );

      const lateAmount = expectedPayments - cumulativePayments;

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

  const fetchLoanDetails = async (
    accountNo: string
  ): Promise<LoanDetails | null> => {
    try {
      // Check if we already have this loan data in cache
      if (loanDetailsCache[accountNo]) {
        const cachedLoanData = loanDetailsCache[accountNo];

        // Update loan details state without changing focus
        setLoanDetails(cachedLoanData);
        return cachedLoanData;
      }

      const response = await fetch(`/api/loans/${accountNo}`);

      if (!response.ok) {
        throw new Error("Loan not found");
      }

      const data = await response.json();

      // Update cache
      setLoanDetailsCache((prev) => ({
        ...prev,
        [accountNo]: data,
      }));

      // Update loan details state
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

      if (loanDetailsCache[accountNo]) {
        setLoanDetails(loanDetailsCache[accountNo]);
      } else {
        await fetchLoanDetails(accountNo);
      }
    }
  };

  const parseDateFromInput = (dateString: string): Date => {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

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

  return (
    <div
      className={`${ubuntu.className} min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 md:p-4 transition-colors`}
    >
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
                />
              ) : (
                <Image
                  src="/lightlogo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  className="w-8 lg:w-10 drop-shadow-[0_0_0_0.5] transition-opacity cursor-pointer"
                  onClick={() => router.push("/")}
                />
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
          <div className="lg:flex justify-between items-center hidden lg:gap-12">
            <span className="text-base md:text-lg font-medium text-gray-600 dark:text-gray-400">
              {formatDate(selectedDate)}
            </span>
            <TimeDisplay />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        <div className="w-full lg:w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 pt-4 md:pt-5 border border-gray-200/60 dark:border-gray-700">
            <span className="hidden">
              {" "}
              ${existingPayments.length} ${selectedAccountNo}{" "}
            </span>
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
                              lateAmounts[payments[currentRow].accountNo] || 0
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

        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700 overflow-hidden flex flex-col min-h-0 max-h-[61vh]">
            <div
              className="flex-1 overflow-x-auto overflow-y-auto relative"
              id="payments-table-body"
            >
              {isLoading && payments.length <= 1 && !payments[0].accountNo ? (
                // Only show loading when initially loading the page or when explicitly needed
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 bg-white/70 dark:bg-gray-800/70 flex items-center justify-center z-20">
                    <div className="flex flex-col justify-end items-center space-y-3">
                      <div className="w-10 h-10 border-[5px] border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-orange-600 dark:text-orange-400 font-medium">
                        Loading payment data...
                      </p>
                    </div>
                  </div>
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-orange-50 dark:bg-orange-950 shadow-md">
                      <tr>
                        {[
                          "Index",
                          "Account No.",
                          "Amount Paid",
                          "Payment Time",
                          "Actions",
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-4 md:px-8 py-4 md:py-5 text-left text-sm md:text-base font-bold text-orange-800 dark:text-orange-200 uppercase tracking-wider bg-opacity-100"
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
                          id={`payment-row-${index}`}
                          onClick={() =>
                            handleRowClick(index, payment.accountNo)
                          }
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
                                if (index === payments.length - 1)
                                  lastRowRef.current = el;
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
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all`}
                              placeholder="Enter Account No."
                            />
                          </td>
                          <td className="px-4 md:px-8 py-3 md:py-4">
                            <input
                              ref={(el) => {
                                inputRefs.current[`amountPaid-${index}`] = el;
                              }}
                              type="number"
                              value={
                                payment.amountPaid === 0 &&
                                !payment.isDefaultAmount
                                  ? ""
                                  : payment.amountPaid
                              }
                              onChange={(e) =>
                                handleAmountPaidChange(e.target.value, index)
                              }
                              onFocus={(e) => handleAmountPaidFocus(e)}
                              onKeyDown={handleKeyDown}
                              className={`w-full px-3 md:px-6 py-2 md:py-3 rounded-xl border text-base md:text-xl font-bold
                  ${
                    selectedCell.row === index &&
                    selectedCell.column === "amountPaid"
                      ? "border-orange-500 ring-2 ring-orange-500/20"
                      : "border-gray-300 dark:border-gray-600"
                  }
                  ${
                    payment.isDefaultAmount && payment.amountPaid !== 0
                      ? "text-orange-600 dark:text-orange-400"
                      : ""
                  }
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all`}
                              placeholder="Enter Amount"
                            />
                          </td>
                          <td className="px-4 md:px-8 py-3 md:py-4">
                            <input
                              ref={(el) => {
                                inputRefs.current[`paymentTime-${index}`] = el;
                              }}
                              type="time"
                              value={payment.paymentTime || ""}
                              onChange={(e) =>
                                handlePaymentTimeChange(e.target.value, index)
                              }
                              onKeyDown={handleKeyDown}
                              className={`w-full px-3 md:px-6 py-2 md:py-3 rounded-xl border text-base md:text-xl font-bold
                  ${
                    selectedCell.row === index &&
                    selectedCell.column === "paymentTime"
                      ? "border-orange-500 ring-2 ring-orange-500/20"
                      : "border-gray-300 dark:border-gray-600"
                  }
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all`}
                            />
                          </td>
                          <td className="px-4 md:px-8 py-3 md:py-4">
                            <button
                              onClick={() => handleDeletePayment(index)}
                              className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 rounded-xl hover:bg-red-100 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table className="w-full min-w-[800px]">
                  <thead className="bg-orange-50 dark:bg-orange-950 shadow-md">
                    <tr>
                      {[
                        "Index",
                        "Account No.",
                        "Amount Paid",
                        "Payment Time",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-4 md:px-8 py-4 md:py-5 text-left text-sm md:text-base font-bold text-orange-800 dark:text-orange-200 uppercase tracking-wider bg-opacity-100"
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
                              if (index === payments.length - 1)
                                lastRowRef.current = el;
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
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all`}
                            placeholder="Enter Account No."
                          />
                        </td>
                        <td className="px-4 md:px-8 py-3 md:py-4">
                          <input
                            ref={(el) => {
                              inputRefs.current[`amountPaid-${index}`] = el;
                            }}
                            type="number"
                            value={
                              payment.amountPaid === 0 &&
                              !payment.isDefaultAmount
                                ? ""
                                : payment.amountPaid
                            }
                            onChange={(e) =>
                              handleAmountPaidChange(e.target.value, index)
                            }
                            onFocus={(e) => handleAmountPaidFocus(e)}
                            onKeyDown={handleKeyDown}
                            className={`w-full px-3 md:px-6 py-2 md:py-3 rounded-xl border text-base md:text-xl font-bold
                ${
                  selectedCell.row === index &&
                  selectedCell.column === "amountPaid"
                    ? "border-orange-500 ring-2 ring-orange-500/20"
                    : "border-gray-300 dark:border-gray-600"
                }
                ${
                  payment.isDefaultAmount && payment.amountPaid !== 0
                    ? "text-orange-600 dark:text-orange-400"
                    : ""
                }
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all`}
                            placeholder="Enter Amount"
                          />
                        </td>
                        <td className="px-4 md:px-2 py-3 md:py-4">
                          <input
                            ref={(el) => {
                              inputRefs.current[`paymentTime-${index}`] = el;
                            }}
                            type="time"
                            value={payment.paymentTime || ""}
                            onChange={(e) =>
                              handlePaymentTimeChange(e.target.value, index)
                            }
                            onKeyDown={handleKeyDown}
                            className={`w-full px-3 md:px-6 py-2 md:py-3 rounded-xl border text-base md:text-xl font-bold
                ${
                  selectedCell.row === index &&
                  selectedCell.column === "paymentTime"
                    ? "border-orange-500 ring-2 ring-orange-500/20"
                    : "border-gray-300 dark:border-gray-600"
                }
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all`}
                          />
                        </td>
                        <td className="px-4 md:px-8 py-3 md:py-4">
                          <button
                            onClick={() => handleDeletePayment(index)}
                            className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 rounded-xl hover:bg-red-100 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="mt-4 md:mt-6 mb-2 md:mb-4 flex flex-col md:flex-row justify-between md:gap-32 text-base md:text-lg items-center gap-4">
            <button
              onClick={savePayments}
              disabled={isSaving} // Disable the button when isSaving is true
              className={`w-full md:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold text-white rounded-xl shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all ${
                isSaving
                  ? "bg-orange-300 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {isSaving ? "Saving..." : "Save All Payments (ALT + S)"}
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
          handleAccountNoChange(accountNo, currentRow);
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
