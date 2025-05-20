import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import PaymentStatusDisplay from "./PaymentStatusDisplay";
import PrintablePaymentTable from "./PrintablePaymentTable";
import "./styles/print.css";

interface Note {
  _id: string;
  date: string;
  category: string;
  loanType: string;
  content: string;
  createdAt: string;
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
  paymentHistory?: { date: string; amount: number }[];
  index?: number;
  loanType?: "daily" | "monthly" | "pending";
  totalToBePaid?: number;
}

interface PaymentTableProps {
  onExportExcel?: () => void;
  loanType: "daily" | "monthly" | "pending";
  fileCategory?: string;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  loanType,
  fileCategory: initialFileCategory,
}) => {
  const [loansData, setLoansData] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentCategory] = useState<string | undefined>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("category") || initialFileCategory
      : initialFileCategory
  );
  const [indexUpdating, setIndexUpdating] = useState<{ [key: string]: boolean }>({});
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState<boolean>(false);

  useEffect(() => {
    fetchLoans();
    fetchNotes();
  }, [loanType, currentCategory, selectedDate]);

 const fetchLoans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const timestamp = new Date().getTime();
      const url = `/api/loansDoc?type=${loanType}${
        currentCategory ? `&category=${currentCategory}` : ""
      }&date=${selectedDate}&_=${timestamp}`;
      
      const response = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      
      if (!response.ok) throw new Error(`Failed to fetch loans: ${response.status}`);
      
      const data = await response.json();
      const loans = Array.isArray(data.loans) ? data.loans : [];

      // Don't filter loans by receivedDate - show all accounts
      setLoansData(loans);
    } catch (err) {
      console.error("Error fetching loans:", err);
      setError("Failed to load loans. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch(
        `/api/notes?date=${selectedDate}&category=${currentCategory || "General"}&loanType=${loanType}`
      );
      if (!response.ok) throw new Error("Failed to fetch notes");
      const data = await response.json();
      setNotes(data.notes || []);
      // Load the latest note into the editor if it exists
      const latestNote = data.notes?.[0];
      if (latestNote) {
        setNoteContent(latestNote.content);
      } else {
        setNoteContent(""); // Clear if no note exists
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError("Failed to load notes. Please try again.");
    }
  };
  
  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      setError("Note content cannot be empty");
      return;
    }
  
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          category: currentCategory || "General",
          loanType,
          content: noteContent,
        }),
      });
  
      if (!response.ok) throw new Error("Failed to save note");
      fetchNotes(); // Refresh notes to reflect the update
      alert("Note saved successfully!");
    } catch (err) {
      console.error("Error saving note:", err);
      setError("Failed to save note. Please try again.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
      fetchNotes();
      // Clear the editor if the deleted note was the latest one
      if (notes[0]?._id === noteId) {
        setNoteContent("");
      }
    } catch (err) {
      console.error("Error deleting note:", err);
      setError("Failed to delete note. Please try again.");
    }
  };

  const handlePaymentChange = (id: string, value: number) => {
    const updatedLoans = loansData.map((loan) =>
      loan._id === id ? { ...loan, paymentReceivedToday: value } : loan
    );
    setLoansData(updatedLoans);
  };

  const handleSavePayment = async (id: string) => {
    const loan = loansData.find((loan) => loan._id === id);
    if (!loan) return;
  
    try {
      const checkResponse = await fetch(
        `/api/loanPayments?loanId=${id}&date=${selectedDate}`
      );
      const data = await checkResponse.json();
      const todayPayments = data.payments.filter((payment: { date: string; _id: string }) =>
        new Date(payment.date).toISOString().split("T")[0] === selectedDate
      );
  
      if (todayPayments.length > 0) {
        for (const payment of todayPayments) {
          await fetch(`/api/loanPayments/${payment._id}`, { method: "DELETE" });
        }
      }
  
      if (loan.paymentReceivedToday > 0) {
        await fetch("/api/loanPayments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loanId: id,
            amount: loan.paymentReceivedToday,
            date: selectedDate,
          }),
        });
      }
  
      await fetchLoans();
    } catch (error) {
      console.error("Error saving payment:", error);
      setError("An error occurred while saving. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this loan?");
    if (!confirmDelete) return;
  
    const confirmPaymentsDelete = confirm("Do you also want to delete all payment histories for this loan?");
    if (!confirmPaymentsDelete) {
      alert("Payment histories will be preserved. Only the loan will be deleted.");
    }
  
    try {
      const response = await fetch(`/api/loansDoc/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Delete-Payments": confirmPaymentsDelete ? "true" : "false",
        },
      });
  
      if (response.ok) {
        fetchLoans();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete loan");
      }
    } catch (error) {
      console.error("Error deleting loan:", error);
      setError("An error occurred while deleting. Please try again.");
    }
  };

  const handleIndexChange = async (id: string, newIndex: number) => {
    if (isNaN(newIndex) || newIndex < 1 || newIndex > 90) { 
      setError("Index must be between 1 and 90");
      return;
    }
    
    try {
      const existingLoan = loansData.find(loan => loan.index === newIndex && loan._id !== id);
      if (existingLoan) {
        setError(`Index ${newIndex} is already taken by ${existingLoan.nameEnglish || existingLoan.nameGujarati}`);
        return;
      }

      setIndexUpdating(prev => ({ ...prev, [id]: true }));

      const response = await fetch(`/api/loansDoc/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: newIndex }),
      });

      if (response.ok) {
        fetchLoans();
      } else {
        let errorMessage = "Failed to update index";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError);
          errorMessage = await response.text() || errorMessage;
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error("Error updating index:", error);
      setError("Failed to update index due to network error");
    } finally {
      setIndexUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const filteredLoans = loansData.filter((loan) => {
    const query = searchQuery.toLowerCase();
    return (
      loan.nameGujarati?.toLowerCase().includes(query) ||
      loan.nameEnglish?.toLowerCase().includes(query) ||
      loan.accountNo?.toLowerCase().includes(query)
    );
  });

  const getTableData = () => {
    const tableData: (Loan | null)[] = new Array(90).fill(null);
    filteredLoans.forEach((loan) => {
      if (loan.index && loan.index >= 1 && loan.index <= 90) {
        tableData[loan.index - 1] = loan;
      }
    });
    const leftSide = tableData.slice(0, 45);
    const rightSide = tableData.slice(45, 90);
    return { leftSide, rightSide };
  };

  const totalPaymentReceivedToday = filteredLoans.reduce(
    (sum, loan) => sum + (loan.paymentReceivedToday || 0),
    0
  );

  const handleShowPrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border-t-4 border-orange-500">
        <div className="text-center py-8 sm:py-10">
          <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 font-bold">Loading loans data...</p>
        </div>
      </div>
    );
  }

  const { leftSide, rightSide } = getTableData();

  if (showPrintPreview) {
    return (
      <PrintablePaymentTable
        loansData={filteredLoans}
        loanType={loanType}
        selectedDate={selectedDate}
        currentCategory={currentCategory}
        onClose={() => setShowPrintPreview(false)}
      />
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border-t-4 border-orange-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl text-orange-700 font-bold">
          {loanType === "daily" ? "Daily" : loanType === "monthly" ? "Monthly" : "Pending"} Loans
          {currentCategory ? ` - ${currentCategory}` : " - All Categories"}
        </h2>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 items-start sm:items-center w-full sm:w-auto">
          <div className="flex items-center w-full sm:w-auto">
            <label htmlFor="date" className="mr-2 text-base text-gray-700 font-bold">Select Date:</label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onFocus={handleFocus}
              className="w-full sm:w-auto px-2 py-1 sm:px-3 sm:py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-base text-gray-700 font-bold"
            />
          </div>
          <div className="flex items-center w-full sm:w-auto">
            <label htmlFor="search" className="mr-2 text-base text-gray-700 font-bold">Search:</label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleFocus}
              placeholder="Search by name or account number..."
              className="w-full sm:w-auto px-2 py-1 sm:px-3 sm:py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-base text-gray-700 font-bold"
            />
          </div>
          <button
            onClick={() => fetchLoans()}
            className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-300 shadow-md text-base font-bold"
          >
            Refresh
          </button>
          <button
            onClick={handleShowPrintPreview}
            disabled={isLoading}
            className={`w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-300 shadow-md text-base font-bold ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Print Preview
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-orange-100 border border-orange-400 text-orange-800 px-4 py-3 rounded-md mb-4 sm:mb-6 shadow-sm text-base font-bold">
          {error}
        </div>
      )}

      {filteredLoans.length === 0 && (
        <div className="text-center text-gray-600 py-4 text-base sm:text-lg font-bold">
          No loans match your search. All 45 rows per side will be empty.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-orange-300">
          <thead>
            <tr className="bg-orange-50 text-orange-800">
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Index</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Inst. Amt</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Name</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Payment Status</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Payment Today</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Actions</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Index</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Inst. Amt</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Name</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Payment Status</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Payment Today</th>
              <th className="border border-orange-300 p-2 sm:p-3 text-base sm:text-lg font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 45 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-orange-50 transition-colors duration-200">
                {/* Left Side */}
                <td className="border border-orange-300 p-2 sm:p-3 text-center text-gray-700 text-base font-bold">
                  {rowIndex + 1}
                  {leftSide[rowIndex] && (
                    <div className="flex items-center mt-1 justify-center">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        defaultValue={leftSide[rowIndex]?.index}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value !== leftSide[rowIndex]?.index) {
                            handleIndexChange(leftSide[rowIndex]!._id, value);
                          }
                        }}
                        onFocus={handleFocus}
                        className="w-14 sm:w-16 px-2 py-1 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-base text-gray-700 font-bold"
                      />
                      {indexUpdating[leftSide[rowIndex]?._id] && (
                        <div className="ml-1 sm:ml-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
                      )}
                    </div>
                  )}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3 text-right text-gray-700 text-base font-bold">
                    {leftSide[rowIndex] ? (loanType === "pending" ? "" : formatCurrency(leftSide[rowIndex]!.installmentAmount)) : ""}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3 text-gray-700 text-base font-bold">
                  {leftSide[rowIndex]?.nameGujarati || ""}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3">
                  {leftSide[rowIndex] && (
                    <PaymentStatusDisplay
                      loan={leftSide[rowIndex]!}
                      selectedDate={selectedDate}
                      onPaymentDeleted={fetchLoans}
                      onLoanUpdated={fetchLoans}
                      loanType={loanType}
                    />
                  )}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3">
                  {leftSide[rowIndex] && (
                    <input
                      type="number"
                      value={leftSide[rowIndex]!.paymentReceivedToday || 0}
                      onChange={(e) =>
                        handlePaymentChange(leftSide[rowIndex]!._id, parseFloat(e.target.value) || 0)
                      }
                      onFocus={handleFocus}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-base text-gray-700 font-bold"
                      min="0"
                    />
                  )}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3">
                  {leftSide[rowIndex] && (
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={() => handleSavePayment(leftSide[rowIndex]!._id)}
                        className="w-full sm:w-auto px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-300 shadow-sm text-base font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleDelete(leftSide[rowIndex]!._id)}
                        className="w-full sm:w-auto px-3 py-1 bg-orange-700 text-white rounded-md hover:bg-orange-800 transition-colors duration-300 shadow-sm text-base font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>

                {/* Right Side */}
                <td className="border border-orange-300 p-2 sm:p-3 text-center text-gray-700 text-base font-bold">
                  {rowIndex + 46}
                  {rightSide[rowIndex] && (
                    <div className="flex items-center mt-1 justify-center">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        defaultValue={rightSide[rowIndex]?.index}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value !== rightSide[rowIndex]?.index) {
                            handleIndexChange(rightSide[rowIndex]!._id, value);
                          }
                        }}
                        onFocus={handleFocus}
                        className="w-14 sm:w-16 px-2 py-1 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-base text-gray-700 font-bold"
                      />
                      {indexUpdating[rightSide[rowIndex]?._id] && (
                        <div className="ml-1 sm:ml-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
                      )}
                    </div>
                  )}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3 text-right text-gray-700 text-base font-bold">
                 {rightSide[rowIndex] ? (loanType === "pending" ? "" : formatCurrency(rightSide[rowIndex]!.installmentAmount)) : ""}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3 text-gray-700 text-base font-bold">
                  {rightSide[rowIndex]?.nameGujarati || ""}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3">
                  {rightSide[rowIndex] && (
                    <PaymentStatusDisplay
                      loan={rightSide[rowIndex]!}
                      selectedDate={selectedDate}
                      onPaymentDeleted={fetchLoans}
                      onLoanUpdated={fetchLoans}
                      loanType={loanType}
                    />
                  )}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3">
                  {rightSide[rowIndex] && (
                    <input
                      type="number"
                      value={rightSide[rowIndex]!.paymentReceivedToday || 0}
                      onChange={(e) =>
                        handlePaymentChange(rightSide[rowIndex]!._id, parseFloat(e.target.value) || 0)
                      }
                      onFocus={handleFocus}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-base text-gray-700 font-bold"
                      min="0"
                    />
                  )}
                </td>
                <td className="border border-orange-300 p-2 sm:p-3">
                  {rightSide[rowIndex] && (
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={() => handleSavePayment(rightSide[rowIndex]!._id)}
                        className="w-full sm:w-auto px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-300 shadow-sm text-base font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleDelete(rightSide[rowIndex]!._id)}
                        className="w-full sm:w-auto px-3 py-1 bg-orange-700 text-white rounded-md hover:bg-orange-800 transition-colors duration-300 shadow-sm text-base font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-orange-100 text-orange-800">
              <td colSpan={4} className="border border-orange-300 p-2 sm:p-3 text-right text-base sm:text-lg font-bold">
                Total Payment Today:
              </td>
              <td className="border border-orange-300 p-2 sm:p-3 text-right text-base sm:text-lg font-bold">
                {formatCurrency(totalPaymentReceivedToday)}
              </td>
              <td colSpan={7} className="border border-orange-300 p-2 sm:p-3"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Simple Note Taking Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-orange-700">Notes</h3>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-300 shadow-md"
          >
            {showNotes ? "Hide Notes" : "Show Notes"}
          </button>
        </div>

        {/* Note Editor */}
        <div className="bg-orange-50 p-4 rounded-lg shadow-md border border-orange-200">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="w-full min-h-[150px] p-3 bg-white border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-black text-base resize-y"
            placeholder="Write your note here..."
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveNote}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-300 shadow-md"
            >
              Save Note
            </button>
          </div>
        </div>

        {/* Notes Preview */}
        {showNotes && (
          <div className="mt-4">
            <h4 className="text-lg font-bold text-orange-700 mb-2">Saved Notes</h4>
            {notes.length === 0 ? (
              <p className="text-gray-600">No notes available for this date, category, and loan type.</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    className="p-4 bg-orange-50 border border-orange-200 rounded-md shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="px-2 py-1 bg-orange-700 text-white rounded-md hover:bg-orange-800 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="text-black whitespace-pre-wrap">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTable;