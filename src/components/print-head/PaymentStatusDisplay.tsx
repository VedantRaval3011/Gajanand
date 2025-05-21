import React, { useState } from "react";

interface Payment {
  _id?: string;
  date: string;
  amount: number;
}

interface Loan {
  _id: string;
  accountNo: string;
  nameEnglish: string;
  nameGujarati: string;
  installmentAmount: number;
  lateAmount: number;
  receivedDate: string;
  paymentReceivedToday: number;
  receivedAmount: number;
  fileCategory: string;
  paymentHistory?: Payment[];
  loanType?: "daily" | "monthly" | "pending";
  totalToBePaid?: number;
}

interface PaymentStatusProps {
  loan: Loan;
  selectedDate: string;
  onPaymentDeleted?: () => void;
  onLoanUpdated?: () => void;
  loanType: "daily" | "monthly" | "pending";
}

interface CalculationDetails {
  monthsSinceStart?: number;
  daysSinceStart?: number;
  totalDue: number;
  totalPaidBeforeToday: number;
  todayPayment: number;
  totalPaid: number;
  remainingAfterToday: number;
  extraDaysCovered?: number;
  extraMonthsCovered?: number;
  coveredUntilDate: string;
  nextDayInstallment?: number;
  nextMonthInstallment?: number;
  lateAmount: number;
  overpayment?: number;
  partialNextDayAmount?: number;
  partialNextMonthAmount?: number;
  remainingForLastDay?: number;
  remainingForLastMonth?: number;
}

const PaymentStatusDisplay: React.FC<PaymentStatusProps> = ({
  loan,
  selectedDate,
  onPaymentDeleted,
  onLoanUpdated,
  loanType,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLoan, setEditedLoan] = useState({
    accountNo: loan.accountNo,
    nameGujarati: loan.nameGujarati,
    nameEnglish: loan.nameEnglish,
    installmentAmount: loan.installmentAmount,
    lateAmount: loanType === "pending" ? 0 : loan.lateAmount, // Set lateAmount to 0 for pending loans
    totalToBePaid: loanType === "pending" ? loan.totalToBePaid || 0 : undefined, // Add totalToBePaid for pending loans
    fileCategory: loan.fileCategory,
    receivedDate: new Date(loan.receivedDate).toISOString().split("T")[0],
  });

  const calculatePaymentStatus = () => {
    const installment = loan.installmentAmount;
    const paymentHistory = loan.paymentHistory || [];
    const receivedDate = new Date(loan.receivedDate);
    const currentDate = new Date(selectedDate.split("T")[0]);
    let lateAmount = loan.lateAmount;

    // Reset time to avoid timezone issues
    receivedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
     // Check if the received date is in the future
  if (receivedDate > currentDate) {
    // Calculate total payments made
    const totalPaidBeforeToday = paymentHistory
      .filter((payment) => new Date(payment.date.split("T")[0]) <= currentDate)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const todayPayment = loan.paymentReceivedToday || 0;
    const totalPaid = totalPaidBeforeToday + todayPayment;
    
    // If payment is made, calculate how many days/installments are covered
    let coveredUntilDate = new Date(receivedDate);
    let statusDate = new Date(receivedDate);
    
    if (totalPaid > 0 && loanType === "daily") {
      // For daily loans, calculate extra days covered
      const extraDaysCovered = Math.floor(totalPaid / installment);
      coveredUntilDate.setDate(coveredUntilDate.getDate() + extraDaysCovered);
      // If extra days are covered, update status date accordingly
      if (extraDaysCovered > 0) {
        statusDate = coveredUntilDate;
      }
    } else if (totalPaid > 0 && loanType === "monthly") {
      // For monthly loans, calculate extra months covered
      const extraMonthsCovered = Math.floor(totalPaid / installment);
      coveredUntilDate.setMonth(coveredUntilDate.getMonth() + extraMonthsCovered);
      // If extra months are covered, update status date accordingly
      if (extraMonthsCovered > 0) {
        statusDate = coveredUntilDate;
      }
    }
    
    const formattedStatusDate = statusDate.toLocaleDateString("en-GB");
    const formattedCoveredDate = coveredUntilDate.toLocaleDateString("en-GB");
    
    return {
      status: formattedStatusDate,
      statusColor: totalPaid > 0 ? "text-green-600" : "text-gray-600",
      nextDueDate: formattedCoveredDate,
      calculationDetails: {
        totalDue: 0,
        totalPaidBeforeToday,
        todayPayment,
        totalPaid,
        remainingAfterToday: -totalPaid, // Negative indicates overpayment
        coveredUntilDate: formattedCoveredDate,
        lateAmount: 0,
        extraDaysCovered: loanType === "daily" ? Math.floor(totalPaid / installment) : undefined,
        extraMonthsCovered: loanType === "monthly" ? Math.floor(totalPaid / installment) : undefined,
      },
      showLateAmount: false,
      prevDayStatus: "",
      prevDayStatusColor: "",
    };
  }


    if (loanType === "pending") {
      const initialTotal = loan.totalToBePaid || 0; // Default to 50,000 as per your example
      const totalPaidBeforeToday = paymentHistory
        .filter((payment) => new Date(payment.date.split("T")[0]) < currentDate)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const todayPayment = loan.paymentReceivedToday || 0;
      const totalPaid = totalPaidBeforeToday + todayPayment;
      const remainingAmount = Math.max(initialTotal - totalPaid, 0);

      console.log(`Pending Loan Calculation for ${loan._id}:`);
      console.log(`- Initial Total: ₹${initialTotal}`);
      console.log(`- Total Paid Before Today: ₹${totalPaidBeforeToday}`);
      console.log(`- Today's Payment: ₹${todayPayment}`);
      console.log(`- Total Paid: ₹${totalPaid}`);
      console.log(`- Remaining: ₹${remainingAmount}`);

      const details: CalculationDetails = {
        totalDue: initialTotal,
        totalPaidBeforeToday,
        todayPayment,
        totalPaid,
        remainingAfterToday: remainingAmount,
        lateAmount: lateAmount,
        coveredUntilDate: currentDate.toLocaleDateString("en-GB"),
      };

      return {
        status: `₹${remainingAmount.toFixed(0)}`,
        statusColor:
          remainingAmount > 0 ? "text-red-600 font-semibold" : "text-green-600",
        nextDueDate: currentDate.toLocaleDateString("en-GB"),
        calculationDetails: details,
        showLateAmount: remainingAmount > 0,
        prevDayStatus: "",
        prevDayStatusColor: "",
      };
    }

    if (loanType === "monthly") {
      const diffTime = currentDate.getTime() - receivedDate.getTime();
      const monthsSinceStart = Math.max(
        Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30)) + 1,
        1
      );
      const totalDue = installment * monthsSinceStart;

      const totalPaidBeforeToday = paymentHistory
        .filter((payment) => new Date(payment.date.split("T")[0]) < currentDate)
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      const todayPayment = loan.paymentReceivedToday || 0;
      const totalPaid = totalPaidBeforeToday + todayPayment;
      const remainingAfterToday = totalDue - totalPaid;

      const prevMonthDate = new Date(currentDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const totalDuePrevMonth = installment * (monthsSinceStart - 1);
      const totalPaidPrevMonth = paymentHistory
        .filter(
          (payment) => new Date(payment.date.split("T")[0]) <= prevMonthDate
        )
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      lateAmount = Math.max(totalDue - totalPaid, 0);

      const extraMonthsCovered = Math.floor(
        Math.abs(remainingAfterToday < 0 ? remainingAfterToday : 0) / installment
      );

      const nextDueDate = new Date(currentDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      const formattedNextDueDate = nextDueDate.toLocaleDateString("en-GB");

      const coveredUntilDate = new Date(currentDate);
      coveredUntilDate.setMonth(coveredUntilDate.getMonth() + 1 + extraMonthsCovered);
      const formattedCoveredDate = coveredUntilDate.toLocaleDateString("en-GB");

      const details: CalculationDetails = {
        monthsSinceStart,
        totalDue,
        totalPaidBeforeToday,
        todayPayment,
        totalPaid,
        remainingAfterToday,
        extraMonthsCovered,
        coveredUntilDate: formattedCoveredDate,
        nextMonthInstallment: installment,
        lateAmount,
      };

      if (remainingAfterToday > 0) {
        return {
          status: `₹${remainingAfterToday.toFixed(0)}`,
          statusColor: "text-red-600 font-semibold",
          nextDueDate: formattedNextDueDate,
          calculationDetails: details,
          showLateAmount: true,
          prevDayStatus:
            totalDuePrevMonth > totalPaidPrevMonth
              ? `₹${(totalDuePrevMonth - totalPaidPrevMonth).toFixed(0)}`
              : prevMonthDate.toLocaleDateString("en-GB"),
          prevDayStatusColor:
            totalDuePrevMonth > totalPaidPrevMonth
              ? "text-red-600"
              : "text-yellow-600",
        };
      } else if (remainingAfterToday === 0) {
        return {
          status: formattedNextDueDate,
          statusColor: "text-yellow-600",
          nextDueDate: formattedNextDueDate,
          calculationDetails: details,
          showLateAmount: false,
          prevDayStatus:
            totalDuePrevMonth > totalPaidPrevMonth
              ? `₹${(totalDuePrevMonth - totalPaidPrevMonth).toFixed(0)}`
              : prevMonthDate.toLocaleDateString("en-GB"),
          prevDayStatusColor:
            totalDuePrevMonth > totalPaidPrevMonth
              ? "text-red-600"
              : "text-yellow-600",
        };
      } else {
        const overpayment = Math.abs(remainingAfterToday);
        const fullMonthsCovered = Math.floor(overpayment / installment);
        const partialNextMonthAmount = overpayment % installment;
        details.overpayment = overpayment;
        details.partialNextMonthAmount = partialNextMonthAmount;
        details.remainingForLastMonth =
          installment - partialNextMonthAmount + installment;

        return {
          status:
            fullMonthsCovered > 0 ? formattedCoveredDate : formattedNextDueDate,
          statusColor:
            fullMonthsCovered > 0 ? "text-green-600" : "text-yellow-600",
          nextDueDate: formattedNextDueDate,
          calculationDetails: details,
          showLateAmount: false,
          prevDayStatus:
            totalDuePrevMonth > totalPaidPrevMonth
              ? `₹${(totalDuePrevMonth - totalPaidPrevMonth).toFixed(0)}`
              : prevMonthDate.toLocaleDateString("en-GB"),
          prevDayStatusColor:
            totalDuePrevMonth > totalPaidPrevMonth
              ? "text-red-600"
              : "text-yellow-600",
        };
      }
    } else {
      // Daily loan logic
      const daysSinceStart = Math.max(
        Math.floor(
          (currentDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1,
        1
      );
      const totalDue = installment * daysSinceStart;

      const totalPaidBeforeToday = paymentHistory
        .filter((payment) => new Date(payment.date.split("T")[0]) < currentDate)
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      const todayPayment = loan.paymentReceivedToday || 0;
      const totalPaid = totalPaidBeforeToday + todayPayment;
      const remainingAfterToday = totalDue - totalPaid;

      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const totalDuePrevDay = installment * (daysSinceStart - 1);
      const totalPaidPrevDay = paymentHistory
        .filter((payment) => new Date(payment.date.split("T")[0]) <= prevDate)
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      const remainingPrevDay = totalDuePrevDay - totalPaidPrevDay;

      const extraDaysCovered = Math.floor(
        Math.abs(remainingAfterToday < 0 ? remainingAfterToday : 0) / installment
      );

      const nextDueDate = new Date(currentDate);
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      const formattedNextDueDate = nextDueDate.toLocaleDateString("en-GB");

      const coveredUntilDate = new Date(currentDate);
      coveredUntilDate.setDate(coveredUntilDate.getDate() + extraDaysCovered);
      const formattedCoveredDate = coveredUntilDate.toLocaleDateString("en-GB");

      const details: CalculationDetails = {
        daysSinceStart,
        totalDue,
        totalPaidBeforeToday,
        todayPayment,
        totalPaid,
        remainingAfterToday,
        extraDaysCovered,
        coveredUntilDate: formattedCoveredDate,
        nextDayInstallment: installment,
        lateAmount: remainingAfterToday > 0 ? remainingAfterToday : lateAmount,
      };

      if (remainingAfterToday > 0) {
        return {
          status: `₹${remainingAfterToday.toFixed(0)}`,
          statusColor: "text-red-600 font-semibold",
          nextDueDate: formattedNextDueDate,
          calculationDetails: details,
          showLateAmount: true,
          prevDayStatus:
            remainingPrevDay > 0
              ? `₹${remainingPrevDay.toFixed(0)}`
              : prevDate.toLocaleDateString("en-GB"),
          prevDayStatusColor:
            remainingPrevDay > 0 ? "text-red-600" : "text-yellow-600",
        };
      } else if (remainingAfterToday === 0) {
        return {
          status: formattedNextDueDate,
          statusColor: "text-yellow-600",
          nextDueDate: formattedNextDueDate,
          calculationDetails: details,
          showLateAmount: false,
          prevDayStatus:
            remainingPrevDay > 0
              ? `₹${remainingPrevDay.toFixed(0)}`
              : prevDate.toLocaleDateString("en-GB"),
          prevDayStatusColor:
            remainingPrevDay > 0 ? "text-red-600" : "text-yellow-600",
        };
      } else {
        const overpayment = Math.abs(remainingAfterToday);
        const fullDaysCovered = Math.floor(overpayment / installment);
        const partialNextDayAmount = overpayment % installment;
        details.overpayment = overpayment;
        details.partialNextDayAmount = partialNextDayAmount;
        details.remainingForLastDay =
          installment - partialNextDayAmount + installment;

        return {
          status:
            fullDaysCovered > 0 ? formattedCoveredDate : formattedNextDueDate,
          statusColor:
            fullDaysCovered > 0 ? "text-green-600" : "text-yellow-600",
          nextDueDate: formattedNextDueDate,
          calculationDetails: details,
          showLateAmount: false,
          prevDayStatus:
            remainingPrevDay > 0
              ? `₹${remainingPrevDay.toFixed(0)}`
              : prevDate.toLocaleDateString("en-GB"),
          prevDayStatusColor:
            remainingPrevDay > 0 ? "text-red-600" : "text-yellow-600",
        };
      }
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (
      !confirm(
        `Are you sure you want to delete the payment of ₹${
          payment.amount
        } on ${new Date(payment.date).toLocaleDateString("en-GB")}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/loanPayments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: loan._id,
          date: payment.date,
        }),
      });

      if (response.ok) {
        if (onPaymentDeleted) onPaymentDeleted();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete payment");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      setError("Failed to delete payment due to network error");
    }
  };

  const handleEditLoanChange = (
    field: keyof typeof editedLoan,
    value: string | number
  ) => {
    setEditedLoan((prev) => ({
      ...prev,
      [field]:
        field === "installmentAmount" || field === "lateAmount" || field === "totalToBePaid"
          ? parseFloat(value as string) || 0
          : value,
    }));
  };

  const handleSaveLoan = async () => {
    try {
      const response = await fetch("/api/loansDoc", {
        method: "PUT",
        body: JSON.stringify({
          id: loan._id,
          ...editedLoan,
          ...(loanType === "pending"
            ? { totalToBePaid: editedLoan.totalToBePaid, lateAmount: 0 } // For pending loans, send totalToBePaid and set lateAmount to 0
            : { lateAmount: editedLoan.lateAmount }), // For daily/monthly loans, send lateAmount
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        if (onLoanUpdated) onLoanUpdated();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update loan");
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      setError("Failed to update loan due to network error");
    }
  };

  const {
    status,
    statusColor,
    nextDueDate,
    calculationDetails,
  } = calculatePaymentStatus();

  const totalDueUpToYesterday =
    loanType === "monthly"
      ? loan.installmentAmount *
        ((calculationDetails.monthsSinceStart || 1) - 1)
      : loanType === "daily"
      ? loan.installmentAmount * ((calculationDetails.daysSinceStart || 1) - 1)
      : 0;
  const remainingUpToYesterday =
    totalDueUpToYesterday - calculationDetails.totalPaidBeforeToday;

  // Updated display logic for previous status
  const displayPrevStatus =
    loanType !== "pending"
      ? `ચડેલ હતા: ₹${
          remainingUpToYesterday > 0 ? remainingUpToYesterday.toFixed(0) : "0"
        }`
      : "";
  const displayPrevColor =
    remainingUpToYesterday > 0 ? "text-red-600" : "text-yellow-600";

  const isLoanStartDate =
    new Date(loan.receivedDate.split("T")[0]).toISOString().split("T")[0] ===
    new Date(selectedDate.split("T")[0]).toISOString().split("T")[0];

 

  return (
    <div className="p-4 flex flex-col justify-center items-center rounded-md shadow-sm relative ">
      {/* Removed the redundant late amount display */}
      <div className="flex flex-col">
        <div className={`${statusColor} text-center`}>{status}</div>
        {!isLoanStartDate && loanType !== "pending" && (
          <div className={`${displayPrevColor} text-sm mt-1 text-center`}>{displayPrevStatus}</div>
        )}
      </div>
      <button
        onClick={() => setShowDetails(true)}
        className="mt-2 text-blue-500 underline text-sm focus:outline-none"
      >
        Show Detailed Info
      </button>

      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-orange-600 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Payment Details</h2>

            <div className="space-y-2 mb-4">
              {isEditing ? (
                <>
                  <div>
                    <strong>Account No:</strong>
                    <input
                      type="text"
                      value={editedLoan.accountNo}
                      onChange={(e) =>
                        handleEditLoanChange("accountNo", e.target.value)
                      }
                      className="w-full px-2 py-1 border text-black rounded-md mt-1"
                    />
                  </div>
                  <div>
                    <strong>Name (Gujarati):</strong>
                    <input
                      type="text"
                      value={editedLoan.nameGujarati}
                      onChange={(e) =>
                        handleEditLoanChange("nameGujarati", e.target.value)
                      }
                      className="w-full px-2 py-1 border text-black rounded-md mt-1"
                    />
                  </div>
                  <div>
                    <strong>Name (English):</strong>
                    <input
                      type="text"
                      value={editedLoan.nameEnglish}
                      onChange={(e) =>
                        handleEditLoanChange("nameEnglish", e.target.value)
                      }
                      className="w-full px-2 py-1 border text-black rounded-md mt-1"
                    />
                  </div>
                  {loanType === "pending" ? (
                    <div>
                      <strong>Total to be Paid:</strong>
                      <input
                        type="number"
                        value={editedLoan.totalToBePaid}
                        onChange={(e) =>
                          handleEditLoanChange("totalToBePaid", e.target.value)
                        }
                        className="w-full px-2 py-1 border text-black rounded-md mt-1"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div>
                      <strong>Installment Amount:</strong>
                      <input
                        type="number"
                        value={editedLoan.installmentAmount}
                        onChange={(e) =>
                          handleEditLoanChange(
                            "installmentAmount",
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 border text-black rounded-md mt-1"
                        min="0"
                      />
                    </div>
                  )}
                  <div>
                    <strong>File Category:</strong>
                    <input
                      type="text"
                      value={editedLoan.fileCategory}
                      onChange={(e) =>
                        handleEditLoanChange("fileCategory", e.target.value)
                      }
                      className="w-full px-2 py-1 border text-black rounded-md mt-1"
                    />
                  </div>
                  <div>
                    <strong>Received Date:</strong>
                    <input
                      type="date"
                      value={editedLoan.receivedDate}
                      onChange={(e) =>
                        handleEditLoanChange("receivedDate", e.target.value)
                      }
                      className="w-full px-2 py-1 border text-black rounded-md mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <strong>Account No:</strong> {loan.accountNo}
                  </p>
                  <p>
                    <strong>Name (Gujarati):</strong> {loan.nameGujarati}
                  </p>
                  <p>
                    <strong>Name (English):</strong> {loan.nameEnglish}
                  </p>
                  <p>
                    <strong>
                      {loanType === "pending"
                        ? "Total To Be Paid"
                        : "Installment Amount"}
                      :
                    </strong>
                    ₹
                    {loanType === "pending"
                      ? loan.totalToBePaid
                      : loan.installmentAmount}
                  </p>
                  <p>
                    <strong>File Category:</strong> {loan.fileCategory}
                  </p>
                  <p>
                    <strong>Next Due Date:</strong> {nextDueDate}
                  </p>
                  <p>
                    <strong>Received Date:</strong>{" "}
                    {new Date(loan.receivedDate).toLocaleDateString("en-GB")}
                  </p>
                </>
              )}
            </div>

            <div className="bg-gray-700 p-4 rounded-md mb-4">
              <h3 className="font-semibold mb-2">Calculation Breakdown</h3>
              <div className="space-y-1 text-sm">
                {loanType === "pending" ? (
                  <>
                    <p>Total To Be Paid: ₹{loan.totalToBePaid || 50000}</p>
                    <p>
                      Paid Before Today: ₹
                      {calculationDetails.totalPaidBeforeToday}
                    </p>
                    <p>Today&apos;s Payment: ₹{calculationDetails.todayPayment}</p>
                    <p className="font-semibold">
                      Total Paid: ₹{calculationDetails.totalPaid}
                    </p>
                    {calculationDetails.remainingAfterToday > 0 ? (
                      <p className="text-red-600 font-semibold">
                        Remaining Amount: ₹
                        {calculationDetails.remainingAfterToday}
                      </p>
                    ) : (
                      <p className="text-green-600 font-semibold">
                        Fully Paid{" "}
                        {calculationDetails.remainingAfterToday < 0
                          ? `(Overpaid by ₹${Math.abs(
                              calculationDetails.remainingAfterToday
                            )})`
                          : ""}
                      </p>
                    )}
                  </>
                ) : loanType === "monthly" ? (
                  <>
                    <p>
                      Months since start: {calculationDetails.monthsSinceStart}
                    </p>
                    <p>
                      Total Due (₹{loan.installmentAmount} ×{" "}
                      {calculationDetails.monthsSinceStart}): ₹
                      {calculationDetails.totalDue}
                    </p>
                    <p>
                      Paid Before Today: ₹
                      {calculationDetails.totalPaidBeforeToday}
                    </p>
                    <p>Today&apos;s Payment: ₹{calculationDetails.todayPayment}</p>
                    <p className="font-semibold">
                      Total Paid: ₹{calculationDetails.totalPaid}
                    </p>
                    {calculationDetails.remainingAfterToday > 0 ? (
                      <p className="text-red-600 font-semibold bg-white p-2">
                        Remaining for today: ₹
                        {calculationDetails.remainingAfterToday}
                      </p>
                    ) : calculationDetails.remainingAfterToday === 0 ? (
                      <p className="text-yellow-400 font-semibold">
                        Exactly paid for today. Next payment (₹
                        {loan.installmentAmount}) due tomorrow.
                      </p>
                    ) : (
                      <>
                        <p className="text-green-600 font-semibold">
                          Overpaid by: ₹
                          {Math.abs(calculationDetails.remainingAfterToday)}
                        </p>
                        {calculationDetails.extraMonthsCovered &&
                          calculationDetails.extraMonthsCovered > 0 && (
                            <p className="text-green-600">
                              Payment covers{" "}
                              {calculationDetails.extraMonthsCovered} additional{" "}
                              {calculationDetails.extraMonthsCovered === 1
                                ? "month"
                                : "months"}
                            </p>
                          )}
                        {calculationDetails.partialNextMonthAmount &&
                          calculationDetails.partialNextMonthAmount > 0 &&
                          calculationDetails.remainingForLastMonth && (
                            <p className="text-blue-600">
                              ₹{calculationDetails.partialNextMonthAmount}{" "}
                              applied towards next month (₹
                              {calculationDetails.remainingForLastMonth} still
                              needed)
                            </p>
                          )}
                        <p className="font-semibold">
                          Paid until: {calculationDetails.coveredUntilDate}
                        </p>
                      </>
                    )}
                    <p className="mt-2 font-semibold">
                      Next due: {nextDueDate} (₹
                      {calculationDetails.nextMonthInstallment ||
                        loan.installmentAmount}
                      )
                    </p>
                  </>
                ) : (
                  <>
                    <p>Days since start: {calculationDetails.daysSinceStart}</p>
                    <p>
                      Total Due (₹{loan.installmentAmount} ×{" "}
                      {calculationDetails.daysSinceStart}): ₹
                      {calculationDetails.totalDue}
                    </p>
                    <p>
                      Paid Before Today: ₹
                      {calculationDetails.totalPaidBeforeToday}
                    </p>
                    <p>Today&apos;s Payment: ₹{calculationDetails.todayPayment}</p>
                    <p className="font-semibold">
                      Total Paid: ₹{calculationDetails.totalPaid}
                    </p>
                    {calculationDetails.remainingAfterToday > 0 ? (
                      <p className="text-red-600 font-semibold bg-white p-2">
                        Remaining for today: ₹
                        {calculationDetails.remainingAfterToday}
                      </p>
                    ) : calculationDetails.remainingAfterToday === 0 ? (
                      <p className="text-yellow-400 font-semibold">
                        Exactly paid for today. Next payment (₹
                        {loan.installmentAmount}) due tomorrow.
                      </p>
                    ) : (
                      <>
                        <p className="text-green-600 font-semibold">
                          Overpaid by: ₹
                          {Math.abs(calculationDetails.remainingAfterToday)}
                        </p>
                        {calculationDetails.extraDaysCovered &&
                          calculationDetails.extraDaysCovered > 0 && (
                            <p className="text-green-600">
                              Payment covers{" "}
                              {calculationDetails.extraDaysCovered} additional{" "}
                              {calculationDetails.extraDaysCovered === 1
                                ? "day"
                                : "days"}
                            </p>
                          )}
                        {calculationDetails.partialNextDayAmount &&
                          calculationDetails.partialNextDayAmount > 0 &&
                          calculationDetails.remainingForLastDay && (
                            <p className="text-blue-600">
                              ₹{calculationDetails.partialNextDayAmount} applied
                              towards tomorrow (₹
                              {calculationDetails.remainingForLastDay} still
                              needed)
                            </p>
                          )}
                        <p className="font-semibold">
                          Paid until: {calculationDetails.coveredUntilDate}
                        </p>
                      </>
                    )}
                    <p className="mt-2 font-semibold">
                      Next due: {nextDueDate} (₹
                      {calculationDetails.nextDayInstallment ||
                        loan.installmentAmount}
                      )
                    </p>
                  </>
                )}
              </div>
            </div>

            {loan.paymentHistory && loan.paymentHistory.length > 0 ? (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Payment History</h3>
                <div className="max-h-40 overflow-y-auto">
                  {loan.paymentHistory.map((payment, index) => (
                    <div
                      key={index}
                      className="text-sm flex justify-between items-center mb-1"
                    >
                      <span>
                        {new Date(payment.date).toLocaleDateString("en-GB")}: ₹
                        {payment.amount}
                      </span>
                      <button
                        onClick={() => handleDeletePayment(payment)}
                        className="text-red-600 hover:text-red-700 bg-white p-2 rounded-xl  text-xs underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white mb-4">
                No payment history available.
              </p>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-600 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveLoan}
                    className="flex-1 bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600 transition-colors"
                >
                  Edit Loan
                </button>
              )}
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusDisplay;