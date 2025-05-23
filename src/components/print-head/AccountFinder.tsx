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
      <h2 className="text-2xl font-bold text-orange-700 mb-6">Account Finder</h2>
      
      {/* Search Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="searchQuery"
              className="block text-gray-700 font-semibold mb-2"
            >
              Account Number
            </label>
            <input
              id="searchQuery"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter account number..."
              className="w-full px-4 py-3 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-black"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`px-6 py-3 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors duration-300 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResult && (
        <div className="bg-white rounded-lg border border-orange-300 shadow-sm">
          {/* Header */}
          <div className="bg-orange-100 px-6 py-4 border-b border-orange-200 rounded-t-lg">
            <h3 className="text-xl font-bold text-orange-700">Account Details</h3>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Account No</label>
                  <p className="text-lg font-semibold text-orange-600">{searchResult.accountNo}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Name</label>
                  <p className="text-lg font-semibold text-orange-600">{searchResult.nameGujarati}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">File Category</label>
                  <p className="text-lg font-semibold text-orange-600">{searchResult.fileCategory}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Loan Type</label>
                  <p className="text-lg font-semibold text-orange-600 capitalize">{searchResult.loanType}</p>
                </div>
              </div>
            </div>

            {/* Payment Status Section */}
            <div className="border-t border-orange-100">
              <h4 className="text-lg font-semibold text-orange-700 mb-4">Payment Status</h4>
              <PaymentStatusDisplay
                loan={searchResult}
                selectedDate={new Date().toISOString().split("T")[0]}
                onPaymentDeleted={() => fetchLoanData(searchResult.accountNo)}
                onLoanUpdated={() => fetchLoanData(searchResult.accountNo)}
                loanType={searchResult.loanType}
              />
            </div>

            {/* Action Button */}
            <div className="border-t border-orange-100 pt-6 mt-6">
              <button
                onClick={handleNavigateToTable}
                className="w-full sm:w-auto px-6 py-3 bg-orange-500 text-white font-semibold rounded-md hover:bg-orange-600 transition-colors duration-300 flex items-center justify-center gap-2"
              >
                <span>📊</span>
                View in Payment Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountFinder;