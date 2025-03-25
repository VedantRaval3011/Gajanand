"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoanForm from "@/components/print-head/LoanForm";
import PaymentTable from "@/components/print-head/PaymentTable";
import { FILE_CATEGORIES } from "@/lib/constants";

type LoanType = "daily" | "monthly" | "pending";

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
}

interface PageParams {
  params: Promise<{ type: string }>;
}

export default function LoansPage({ params }: PageParams) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loanType, setLoanType] = useState<LoanType | null>(null);
  const [activeView, setActiveView] = useState<"form" | "table">("table");

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;
      const type = resolvedParams.type as LoanType;
      setLoanType(type);
    }
    resolveParams();
  }, [params]);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push("/admin");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [router]);

  const fileCategory = searchParams.get("category") || "";

  useEffect(() => {
    if (!loanType) return;

    const isLoanTypeValid = ["daily", "monthly", "pending"].includes(loanType);
    const isFileCategoryValid =
      fileCategory && FILE_CATEGORIES[loanType]?.includes(fileCategory);

    if (!isLoanTypeValid) {
      router.push("/admin");
      return;
    }

    if (!isFileCategoryValid) {
      setError(
        `Invalid file category: ${fileCategory}. Available: ${FILE_CATEGORIES[loanType]?.join(", ")}`
      );
      return;
    }
  }, [loanType, fileCategory, router]);

  const fetchLoans = async () => {
    if (!loanType || !fileCategory) return;

    try {
      setIsLoading(true);
      setError(null);

      const toDate = new Date().toISOString().split("T")[0];
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const response = await fetch(
        `/api/loans?loanType=${loanType}&fileCategory=${fileCategory}&fromDate=${fromDate}&toDate=${toDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setLoans(data.loans);
      } else {
        const errorData = await response.json();
        setError(
          `Failed to load loans (${response.status}): ${errorData.message || "Unknown error"}`
        );
      }
    } catch {
      setError("Failed to load loans. Please check your network connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [loanType, fileCategory]);

  if (!loanType) {
    return <div className="p-10 bg-gradient-to-br from-orange-400 to-orange-600 text-white">Loading loan type...</div>;
  }

  if (isLoading) {
    return <div className="p-10 bg-gradient-to-br from-orange-400 to-orange-600 text-white">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-10 bg-gradient-to-br from-orange-400 to-orange-600 text-white">
        <div className="mb-6">
          <a href="/admin" className="text-white hover:underline font-bold text-lg">
            ← Back to Collections
          </a>
        </div>
        <div className="bg-orange-100 text-orange-800 p-4">
          <p className="font-bold text-lg">Error</p>
          <p className="text-base">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 text-base transition-colors duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 bg-gradient-to-br from-orange-400 to-orange-600 text-white min-h-screen">
      <div className="mb-6">
        <a href="/admin" className="text-white hover:underline font-bold text-lg">
          ← Back to Collections
        </a>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        {loanType === "daily" ? "Daily" : loanType === "monthly" ? "Monthly" : "Pending"} Loans - {fileCategory}
      </h1>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveView("table")}
          className={`px-6 py-2 text-lg font-bold transition-colors duration-300 ${
            activeView === "table" ? "bg-orange-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
        >
          Payment Table
        </button>
        <button
          onClick={() => setActiveView("form")}
          className={`px-6 py-2 text-lg font-bold transition-colors duration-300 ${
            activeView === "form" ? "bg-orange-700 text-white" : "bg-orange-900 hover:bg-orange-600 text-white"
          }`}
        >
          Add Loan
        </button>
      </div>
      <span className="hidden"> {`${loans}`}</span>
      <div>
        {activeView === "form" ? (
          <LoanForm
            loanType={loanType}
            fileCategory={fileCategory}
            onLoanAdded={fetchLoans}
            setActiveView={setActiveView}
          />
        ) : (
          <PaymentTable
            loanType={loanType}
            fileCategory={fileCategory}
          />
        )}
      </div>
    </div>
  );
}