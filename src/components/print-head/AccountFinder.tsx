"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PaymentStatusDisplay from "./PaymentStatusDisplay"; // Adjust path as needed

interface Loan {
  _id: string;
  accountNo: string;
  nameEnglish: string;
  nameGujarati: string;
  fileCategory: string;
  loanType: "daily" | "monthly" | "pending";
  installmentAmount: number;
  receivedAmount: number;
  paymentHistory?: { date: string; amount: number }[];
  lateAmount: number;
  receivedDate: string;
  paymentReceivedToday: number;
}

const AccountFinder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchResult, setSearchResult] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const fetchLoanData = async (accountNo: string) => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch(
      `/api/loansDoc?search=${encodeURIComponent(accountNo)}`,
      {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status}`);
    }

    const data = await response.json();
    console.log("API returned loans:", data.loans);

    const matchingLoan = data.loans.find((loan: Loan) => loan.accountNo === accountNo);
    console.log("Matching loan:", matchingLoan);

    if (matchingLoan) {
      setSearchResult(matchingLoan);
    } else {
      setError("No account found with this account number");
      setSearchResult(null);
    }
  } catch (err) {
    console.error("Error fetching account:", err);
    setError("Failed to load account. Please try again.");
    setSearchResult(null);
  } finally {
    setIsLoading(false);
  }
};

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setError("Please enter an account number");
      return;
    }
    fetchLoanData(searchQuery);
  };

  const handleNavigateToTable = () => {
    if (searchResult) {
      const { loanType, fileCategory, _id } = searchResult;
      router.push(
        `/admin/loans/${loanType}?category=${fileCategory}&highlight=${_id}`
      );
    }
  };

  return (
    <div className="bg-orange-50 p-6 rounded-lg shadow-md border border-orange-200 mb-6">
      <h2 className="text-2xl font-bold text-orange-700 mb-4">Account Finder</h2>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex-1">
          <label
            htmlFor="searchQuery"
            className="block text-gray-700 font-bold mb-1"
          >
            Account Number
          </label>
          <input
            id="searchQuery"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter account number..."
            className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-black"
          />
        </div>
      </div>
      <button
        onClick={handleSearch}
        disabled={isLoading}
        className={`w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-300 ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? "Searching..." : "Search"}
      </button>

      {error && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-600 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {searchResult && (
        <div className="mt-4 p-4 bg-white rounded-md borde  border-orange-300">
          <h3 className="text-lg font-bold text-orange-700">Account Details</h3>
          <p className="text-orange-500">
            <strong>Account No:</strong> {searchResult.accountNo}
          </p>
          
          <p className="text-orange-500">
            <strong>Name: </strong> {searchResult.nameGujarati}
          </p>
          <p className="text-orange-500">
            <strong>File Category:</strong> {searchResult.fileCategory}
          </p>
          <p className="text-orange-500">
            <strong>Loan Type:</strong> {searchResult.loanType}
          </p>
          <div className="mt-2">
            <h4 className="text-md font-semibold text-orange-600">
              Payment Status
            </h4>
            <PaymentStatusDisplay
              loan={searchResult}
              selectedDate={selectedDate}
              onPaymentDeleted={() => fetchLoanData(searchResult.accountNo)}
              onLoanUpdated={() => fetchLoanData(searchResult.accountNo)}
              loanType={searchResult.loanType}
            />
          </div>
          <button
            onClick={handleNavigateToTable}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-300"
          >
            View in Payment Table
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountFinder;