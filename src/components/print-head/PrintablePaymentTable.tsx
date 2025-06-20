import React, { useRef } from "react";

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
  index?: number;
  totalToBePaid?: number;
}

interface PrintablePaymentTableProps {
  loansData: Loan[];
  loanType: "daily" | "monthly" | "pending";
  selectedDate: string;
  currentCategory?: string;
  onClose: () => void;
}

const PrintablePaymentTable: React.FC<PrintablePaymentTableProps> = ({
  loansData,
  loanType,
  selectedDate,
  currentCategory,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const calculateMonthsSinceStart = (
    startDate: Date | string,
    currentDate: Date | string
  ): number => {
    const start = new Date(startDate);
    const current = new Date(currentDate);

    let months = 0;
    let tempDate = new Date(start);

    // Count complete months
    while (tempDate <= current) {
      const nextMonth = new Date(tempDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (nextMonth <= current) {
        months++;
        tempDate = nextMonth;
      } else {
        break;
      }
    }

    // Check if we're in a partial month (add 1 if current date is past the start date of the month)
    if (tempDate <= current) {
      months++;
    }

    return months;
  };


  const calculatePaymentStatus = (loan: Loan) => {
    const paymentHistory = loan.paymentHistory || [];
    const todayPayment = loan.paymentReceivedToday || 0;
    const currentDate = new Date(selectedDate.split("T")[0]);
    const installment = loan.installmentAmount;
    const receivedDate = new Date(loan.receivedDate.split("T")[0]);

    // Reset time to avoid timezone issues
    receivedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    // Check if the loan hasn't started yet (received date is in the future)
    if (receivedDate > currentDate) {
      const totalPaidBeforeToday = paymentHistory
        .filter(
          (payment) => new Date(payment.date.split("T")[0]) <= currentDate
        )
        .reduce((sum, payment) => sum + payment.amount, 0);
      const totalPaid = totalPaidBeforeToday + todayPayment;
      const coveredUntilDate = new Date(receivedDate);
      let statusDate = new Date(receivedDate);

      if (totalPaid > 0) {
        if (loanType === "daily") {
          const extraDaysCovered = Math.floor(totalPaid / installment);
          coveredUntilDate.setDate(
            coveredUntilDate.getDate() + extraDaysCovered
          );
          if (extraDaysCovered > 0) {
            statusDate = coveredUntilDate;
          }
        } else if (loanType === "monthly") {
          const extraMonthsCovered = Math.floor(totalPaid / installment);
          coveredUntilDate.setMonth(
            coveredUntilDate.getMonth() + extraMonthsCovered
          );
          if (extraMonthsCovered > 0) {
            statusDate = coveredUntilDate;
          }
        }
      }

      const formattedStatusDate = statusDate.toLocaleDateString("en-GB");

      return {
        status: formattedStatusDate,
        statusColor:
          totalPaid > 0
            ? "text-green-600 text-black screen-text-green"
            : "text-yellow-600 text-black screen-text-yellow",
        showLateAmount: false,
        prevStatus: "0",
        prevStatusColor: "text-yellow-600 screen-text-yellow",
      };
    }

    // Pending loans
    if (loanType === "pending") {
      const totalToBePaid = loan.totalToBePaid || 0;
      const totalPaidBeforeToday = paymentHistory
        .filter((payment) => new Date(payment.date.split("T")[0]) < currentDate)
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      const totalPaid = totalPaidBeforeToday + todayPayment;
      const remainingAmount = Math.max(totalToBePaid - totalPaid, 0);

      return {
        status: remainingAmount.toFixed(0),
        statusColor:
          remainingAmount > 0
            ? "text-red-600 text-black screen-text-red"
            : "text-yellow-600 text-black screen-text-yellow",
        showLateAmount: remainingAmount > 0,
        prevStatus: "",
        prevStatusColor: "",
      };
    }

    // Monthly loans
    if (loanType === "monthly") {
      const diffTime = currentDate.getTime() - receivedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const monthsSinceStart = calculateMonthsSinceStart(receivedDate, currentDate);
      const totalDue = installment * monthsSinceStart;

      const totalPaidBeforeToday = paymentHistory
        .filter((payment) => new Date(payment.date.split("T")[0]) < currentDate)
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      const totalPaid = totalPaidBeforeToday + todayPayment;
      const remainingAfterToday = totalDue - totalPaid;

      const prevMonthDate = new Date(currentDate);
      prevMonthDate.setDate(prevMonthDate.getDate() - 1);
      const prevMonthsSinceStart = Math.max(calculateMonthsSinceStart(receivedDate, prevMonthDate), 0);
      const totalDuePrevMonth = installment * prevMonthsSinceStart;
      const totalPaidPrevMonth = paymentHistory
        .filter(
          (payment) => new Date(payment.date.split("T")[0]) <= prevMonthDate
        )
        .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      const remainingUpToPrevMonth = totalDuePrevMonth - totalPaidPrevMonth;

      const extraMonthsCovered = Math.floor(
        Math.abs(remainingAfterToday < 0 ? remainingAfterToday : 0) /
          installment
      );

      const nextDueDate = new Date(receivedDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + monthsSinceStart);
      const formattedNextDueDate = nextDueDate.toLocaleDateString("en-GB");

      const coveredUntilDate = new Date(receivedDate);
      coveredUntilDate.setMonth(
        coveredUntilDate.getMonth() + monthsSinceStart + extraMonthsCovered
      );
      const formattedCoveredDate = coveredUntilDate.toLocaleDateString("en-GB");

      if (remainingAfterToday > 0) {
        return {
          status: remainingAfterToday.toFixed(0),
          statusColor: "text-red-600 text-black screen-text-red",
          showLateAmount: true,
          prevStatus:
            remainingUpToPrevMonth > 0
              ? remainingUpToPrevMonth.toFixed(0)
              : "0",
          prevStatusColor:
            remainingUpToPrevMonth > 0
              ? "text-red-600 screen-text-red"
              : "text-yellow-600 screen-text-yellow",
        };
      } else if (remainingAfterToday === 0) {
        return {
          status: formattedNextDueDate,
          statusColor: "text-yellow-600 text-black screen-text-yellow",
          showLateAmount: false,
          prevStatus:
            remainingUpToPrevMonth > 0
              ? remainingUpToPrevMonth.toFixed(0)
              : "0",
          prevStatusColor:
            remainingUpToPrevMonth > 0
              ? "text-red-600 screen-text-red"
              : "text-yellow-600 screen-text-yellow",
        };
      } else {
        const fullMonthsCovered = Math.floor(
          Math.abs(remainingAfterToday) / installment
        );
        return {
          status:
            fullMonthsCovered > 0 ? formattedCoveredDate : formattedNextDueDate,
          statusColor:
            fullMonthsCovered > 0
              ? "text-green-600 text-black screen-text-green"
              : "text-yellow-600 text-black screen-text-yellow",
          showLateAmount: false,
          prevStatus:
            remainingUpToPrevMonth > 0
              ? remainingUpToPrevMonth.toFixed(0)
              : "0",
          prevStatusColor:
            remainingUpToPrevMonth > 0
              ? "text-red-600 screen-text-red"
              : "text-yellow-600 screen-text-yellow",
        };
      }
    }

    // Daily loans
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
    const totalPaid = totalPaidBeforeToday + todayPayment;
    const remainingAfterToday = totalDue - totalPaid;

    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const totalDuePrevDay = installment * (daysSinceStart - 1);
    const totalPaidPrevDay = paymentHistory
      .filter((payment) => new Date(payment.date.split("T")[0]) <= prevDate)
      .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
    const remainingUpToYesterday = totalDuePrevDay - totalPaidPrevDay;

    const extraDaysCovered = Math.floor(
      Math.abs(remainingAfterToday < 0 ? remainingAfterToday : 0) / installment
    );

    const nextDueDate = new Date(currentDate);
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const formattedNextDueDate = nextDueDate.toLocaleDateString("en-GB");

    const coveredUntilDate = new Date(currentDate);
    coveredUntilDate.setDate(coveredUntilDate.getDate() + extraDaysCovered);
    const formattedCoveredDate = coveredUntilDate.toLocaleDateString("en-GB");

    if (remainingAfterToday > 0) {
      return {
        status: remainingAfterToday.toFixed(0),
        statusColor: "text-red-600 text-black screen-text-red",
        showLateAmount: true,
        prevStatus:
          remainingUpToYesterday > 0 ? remainingUpToYesterday.toFixed(0) : "0",
        prevStatusColor:
          remainingUpToYesterday > 0
            ? "text-red-600 screen-text-red"
            : "text-yellow-600 screen-text-yellow",
      };
    } else if (remainingAfterToday === 0) {
      return {
        status: formattedNextDueDate,
        statusColor: "text-yellow-600 text-black screen-text-yellow",
        showLateAmount: false,
        prevStatus:
          remainingUpToYesterday > 0 ? remainingUpToYesterday.toFixed(0) : "0",
        prevStatusColor:
          remainingUpToYesterday > 0
            ? "text-red-600 screen-text-red"
            : "text-yellow-600 screen-text-yellow",
      };
    } else {
      const fullDaysCovered = Math.floor(
        Math.abs(remainingAfterToday) / installment
      );
      return {
        status:
          fullDaysCovered > 0 ? formattedCoveredDate : formattedNextDueDate,
        statusColor:
          fullDaysCovered > 0
            ? "text-green-600 text-black screen-text-green"
            : "text-yellow-600 text-black screen-text-yellow",
        showLateAmount: false,
        prevStatus:
          remainingUpToYesterday > 0 ? remainingUpToYesterday.toFixed(0) : "0",
        prevStatusColor:
          remainingUpToYesterday > 0
            ? "text-red-600 screen-text-red"
            : "text-yellow-600 screen-text-yellow",
      };
    }
  };

  const getTableData = () => {
    const tableData: (Loan | null)[] = new Array(90).fill(null);

    loansData.forEach((loan) => {
      if (loan.index && loan.index >= 1 && loan.index <= 90) {
        tableData[loan.index - 1] = loan;
      }
    });

    const leftSide = tableData.slice(0, 45);
    const rightSide = tableData.slice(45, 90);

    return { leftSide, rightSide };
  };

  const handlePrint = () => {
    window.print();
  };

  const { leftSide, rightSide } = getTableData();
  const formattedDate = new Date(selectedDate)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "/");

  const dayName = new Date(selectedDate)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();

  return (
    <div ref={printRef} className="bg-white a4-print-component">
      <style jsx global>{`
        /* Mobile-specific styles */
        @media screen and (max-width: 768px) {
          .a4-print-component {
            width: 100%;
            padding: 2mm;
            margin: 0;
            border: none;
            overflow-x: auto;
            overflow-y: visible;
          }

          .header-info {
            flex-direction: column;
            align-items: flex-start;
            padding: 5px;
            font-size: 12pt;
            margin-bottom: 5mm;
            border: 1px solid black;
          }

          .header-info span {
            width: 100%;
            text-align: left;
            margin: 2px 0;
          }

          .header-info .date,
          .header-info .admin,
          .header-info .day {
            text-align: left;
          }

          .no-print {
            padding: 5px;
          }

          table {
            min-width: 700px; /* Prevents table compression */
            font-size: 10pt;
          }

          th, td {
            padding: 3px;
            height: auto;
            max-height: none;
          }
        }

        /* Screen-specific styles (Desktop/Laptop) */
        @media screen and (min-width: 769px) {
          .a4-print-component {
            width: 190mm;
            height: auto;
            min-height: auto;
            max-height: 297mm;
            padding: 5mm 10mm;
            box-sizing: border-box;
            margin: 0 auto;
            border: 1px solid #ccc;
            overflow: hidden;
          }
          
          .header-info {
            display: flex;
            justify-content: space-between;
            border: 2px solid black;
            padding: 3px 5px;
            margin-bottom: 3mm;
            font-weight: bold;
            font-size: 10pt;
            white-space: nowrap;
            color: black !important;
          }
          
          .header-info span {
            flex: 1;
            text-align: center;
            color: black !important;
          }
          
          .header-info .date {
            text-align: left;
          }
          
          .header-info .admin {
            text-align: center;
          }
          
          .header-info .day {
            text-align: right;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Arial, sans-serif;
            margin: 0 auto;
          }
          
          table, th, td {
            border: 2px solid black;
            font-size: 9pt;
            text-align: center;
          }
          
          th {
            font-weight: bold;
            background-color: #fee2e2 !important;
            padding: 2px 2px;
            height: 4mm;
            max-height: 4mm;
            color: black !important;
          }
          
          td {
            padding: 1px 2px;
            vertical-align: middle;
            height: 4mm;
            max-height: 4mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-weight: bold;
          }
                    
          .index-col {
            width: 4%;
          }
          
          .name-col {
            width: 14%;
          }
          
          .amount-col {
            width: 8%;
          }
          
          .payment-col {
            width: 4%;
          }
        }

        /* Common screen styles */
        @media screen {
          .a4-print-component td, 
          .a4-print-component th,
          .a4-print-component .header-info,
          .a4-print-component .text-amount {
            color: black !important;
            font-weight: bold;
          }
          
          .screen-text-red {
            color: #dc2626 !important; 
            font-weight: bold;
          }
          
          .screen-text-yellow {
            color: #ca8a04 !important;
            font-weight: bold;
          }
          
          .screen-text-green {
            color: #16a34a !important;
            font-weight: bold;
          }
          
          .text-blue {
            color: blue !important;
            font-weight: bold;
          }
        }

        /* Print-specific styles */
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }

          body * {
            visibility: hidden;
          }

          .a4-print-component,
          .a4-print-component * {
            visibility: visible;
          }

          .a4-print-component {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 190mm;
            height: auto;
            min-height: auto;
            max-height: 297mm;
            padding: 5mm 10mm;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: avoid;
            margin: 0 auto;
          }

          .no-print {
            display: none !important;
          }

          .header-info {
            display: flex;
            justify-content: space-between;
            border: 2px solid black;
            padding: 3px 5px;
            margin-bottom: 3mm;
            font-weight: 900;
            font-size: 10pt;
            white-space: nowrap;
            page-break-after: avoid;
            color: black;
          }

          .header-info span {
            flex: 1;
            text-align: center;
          }

          .header-info .date {
            text-align: left;
          }

          .header-info .admin {
            text-align: center;
          }

          .header-info .day {
            text-align: right;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            page-break-after: avoid;
            font-family: Arial, sans-serif;
            margin: 0 auto;
          }

          table,
          th,
          td {
            border: 2px solid black;
            font-size: 9pt;
            text-align: center;
            color: black;
          }

          th {
            font-weight: 900;
            background-color: #fee2e2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            padding: 2px 2px;
            height: 5mm;
            max-height: 5mm;
          }

          td {
            padding: 1px 2px;
            page-break-inside: avoid;
            vertical-align: middle;
            height: 5.5mm;
            max-height: 5.5mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-weight: 900;
          }

          tr {
            page-break-inside: avoid;
            height: 5.5mm;
            max-height: 5.5mm;
          }

          .header-row {
            border-bottom: 2px solid black;
          }

          .index-col {
            width: 7%;
          }

          .name-col {
            width: 20%; 
          }

          .amount-col {
            width: 12%;
          }

          .payment-col {
            width: 9%;
          }

          .text-blue {
            color: blue;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .text-red-600 {
            color: #dc2626;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .text-yellow-600 {
            color: #ca8a04;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .text-green-600 {
            color: #16a34a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .text-amount {
            color: black;
            font-weight: 900;
          }

          .print-table-container {
            page-break-after: avoid;
            page-break-inside: avoid;
            transform: scale(0.93);  
            transform-origin: top center;
          }
        }
      `}</style>

      <div className="no-print flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">
          {loanType === "daily"
            ? "Daily"
            : loanType === "monthly"
            ? "Monthly"
            : "Pending"}{" "}
          Loans
          {currentCategory ? ` - ${currentCategory}` : " - All Categories"}
        </h2>
        <div className="flex space-x-4">
          <button
            onClick={handlePrint}
            className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Close
          </button>
        </div>
      </div>

      <div className="header-info">
        <span className="date">DATE: {formattedDate}</span>
        <span className="admin flex gap-5">
          શ્રી ગણેશાયનમઃ <span>{currentCategory}</span>
        </span>
        <span className="day">DAY: {dayName}</span>
      </div>

      <div className="print-table-container">
        <table className="w-full border-collapse border border-gray-500 text-xs">
          <thead>
            <tr className="header-row">
              <th
                className="border border-gray-500 p-1 index-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                હપ્તો
              </th>
              <th
                className="border border-gray-500 p-1 name-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                નામ
              </th>
              <th
                className="border border-gray-500 p-1 amount-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                ચડેલ
              </th>
              <th
                className="border border-gray-500 p-1 payment-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                આવેલ
              </th>
              <th
                className="border border-gray-500 p-1 index-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                હપ્તો
              </th>
              <th
                className="border border-gray-500 p-1 name-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                નામ
              </th>
              <th
                className="border border-gray-500 p-1 amount-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                ચડેલ
              </th>
              <th
                className="border border-gray-500 p-1 payment-col"
                style={{ backgroundColor: "#fee2e2" }}
              >
                આવેલ
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 45 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {/* Left Side */}
                <td className="border border-gray-500 p-1 index-col text-amount">
                  {leftSide[rowIndex]?.installmentAmount &&
                  loanType !== "pending"
                    ? leftSide[rowIndex]!.installmentAmount
                    : ""}
                </td>
                <td className="border border-gray-500 p-1 name-col">
                  {leftSide[rowIndex]?.nameGujarati || ""}
                  {leftSide[rowIndex]?.index && loanType !== "pending" && (
                    <span className="text-blue ml-1">
                      \{leftSide[rowIndex]?.accountNo}
                    </span>
                  )}
                </td>
                <td
                  className={`border border-gray-500 p-1 amount-col ${
                    leftSide[rowIndex]
                      ? calculatePaymentStatus(leftSide[rowIndex]!).statusColor
                      : ""
                  }`}
                >
                  {leftSide[rowIndex]
                    ? calculatePaymentStatus(
                        leftSide[rowIndex]!
                      ).status.includes("/")
                      ? calculatePaymentStatus(leftSide[rowIndex]!).status
                      : `₹${calculatePaymentStatus(leftSide[rowIndex]!).status}`
                    : ""}
                </td>
                <td className="border border-gray-500 p-1 payment-col"> </td>

                {/* Right Side */}
                <td className="border border-gray-500 p-1 index-col text-amount">
                  {rightSide[rowIndex]?.installmentAmount &&
                  loanType !== "pending"
                    ? rightSide[rowIndex]!.installmentAmount
                    : ""}
                </td>
                <td className="border border-gray-500 p-1 name-col">
                  {rightSide[rowIndex]?.nameGujarati || ""}
                  {rightSide[rowIndex]?.index && loanType !== "pending" && (
                    <span className="text-blue ml-1">
                      \{rightSide[rowIndex]?.accountNo}
                    </span>
                  )}
                </td>
                <td
                  className={`border border-gray-500 p-1 amount-col ${
                    rightSide[rowIndex]
                      ? calculatePaymentStatus(rightSide[rowIndex]!).statusColor
                      : ""
                  }`}
                >
                  {rightSide[rowIndex]
                    ? calculatePaymentStatus(
                        rightSide[rowIndex]!
                      ).status.includes("/")
                      ? calculatePaymentStatus(rightSide[rowIndex]!).status
                      : `₹${
                          calculatePaymentStatus(rightSide[rowIndex]!).status
                        }`
                    : ""}
                </td>
                <td className="border border-gray-500 p-1 payment-col"> </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintablePaymentTable;
