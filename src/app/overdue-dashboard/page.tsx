"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, RefreshCw, Search } from "lucide-react";
import { Ubuntu } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TimeDisplay from "@/ui/TimeDisplay";
import { useNavigation } from "@/utils/routeMapping";
import { useNavigationStore } from "@/store/NavigationStore";
import type {
  OverdueRow,
  OverdueSeverity,
  OverdueSummary,
} from "@/lib/overdue";

const ubuntu = Ubuntu({ weight: "400", subsets: ["latin"] });

type SortKey =
  | "accountNo"
  | "nameEnglish"
  | "daysOverdue"
  | "installmentsBehind"
  | "amountDue"
  | "lateFee"
  | "totalOutstanding"
  | "daysSinceLastPayment";

interface OverdueResponse {
  asOf: string;
  summary: OverdueSummary;
  rows: OverdueRow[];
  categories: string[];
}

const SEVERITY_LABEL: Record<OverdueSeverity, string> = {
  low: "1–7 days",
  medium: "8–30 days",
  high: "30+ days",
};

const SEVERITY_BADGE: Record<OverdueSeverity, string> = {
  low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  medium:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

const formatRupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const localToday = () => {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default function OverdueDashboard() {
  const router = useRouter();
  const setSelectedNavItem = useNavigationStore(
    (state) => state.setSelectedNavItem
  );

  const [asOf, setAsOf] = useState(localToday());
  const [data, setData] = useState<OverdueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "daily" | "monthly">(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState<
    "all" | OverdueSeverity
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalOutstanding");
  const [sortDesc, setSortDesc] = useState(true);

  useNavigation({ onEscape: (parent, index) => setSelectedNavItem(parent, index) });

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved === "dark";
    setDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleDarkMode]);

  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/overdue?date=${date}`);
      if (!res.ok) throw new Error("Request failed");
      setData(await res.json());
    } catch {
      setError("Error fetching overdue loans. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(localToday());
  }, [fetchData]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.rows.filter((r) => {
      if (typeFilter !== "all" && r.loanType !== typeFilter) return false;
      if (categoryFilter !== "all" && r.fileCategory !== categoryFilter)
        return false;
      if (severityFilter !== "all" && r.severity !== severityFilter)
        return false;
      if (
        q &&
        !(
          r.accountNo.toLowerCase().includes(q) ||
          r.nameEnglish.toLowerCase().includes(q) ||
          r.nameGujarati.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });

    const dir = sortDesc ? -1 : 1;
    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Never-paid accounts (null) sort as the longest since last payment.
      const an = av === null ? Number.MAX_SAFE_INTEGER : av;
      const bn = bv === null ? Number.MAX_SAFE_INTEGER : bv;
      if (typeof an === "string" && typeof bn === "string") {
        return an.localeCompare(bn, undefined, { numeric: true }) * dir;
      }
      return ((an as number) - (bn as number)) * dir;
    });
  }, [data, search, typeFilter, categoryFilter, severityFilter, sortKey, sortDesc]);

  const shownTotal = useMemo(
    () => rows.reduce((sum, r) => sum + r.totalOutstanding, 0),
    [rows]
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "accountNo" && key !== "nameEnglish");
    }
  };

  const exportCsv = () => {
    const header = [
      "Account No",
      "Name",
      "File",
      "Type",
      "Installment",
      "Installments Behind",
      "Days Overdue",
      "Amount Due",
      "Late Fee",
      "Total Outstanding",
      "Last Payment",
      "Days Since Last Payment",
    ];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        r.accountNo,
        r.nameEnglish,
        r.fileCategory,
        r.loanType,
        r.installmentAmount,
        r.installmentsBehind,
        r.daysOverdue,
        r.amountDue,
        r.lateFee,
        r.totalOutstanding,
        formatDate(r.lastPaymentDate),
        r.daysSinceLastPayment ?? "",
      ]
        .map(escape)
        .join(",")
    );
    const csv = "﻿" + [header.map(escape).join(","), ...lines].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `overdue-loans-${data?.asOf ?? asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = darkMode ? "bg-gray-800" : "bg-white";
  const input = `px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
  }`;

  const Th = ({
    label,
    k,
    align = "right",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
  }) => (
    <th
      onClick={() => handleSort(k)}
      className={`p-3 font-semibold border-b cursor-pointer select-none whitespace-nowrap hover:text-orange-500 ${
        align === "left" ? "text-left" : "text-right"
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k &&
          (sortDesc ? (
            <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          ))}
      </span>
    </th>
  );

  const summary = data?.summary;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      } ${ubuntu.className} antialiased`}
    >
      <div className={`w-full ${card} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Image
            src={darkMode ? "/GFLogo.png" : "/lightlogo.png"}
            alt="logo"
            height={50}
            width={50}
            className="w-12 lg:w-14 cursor-pointer"
            onClick={() => router.push("/")}
          />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center">
            Overdue &amp; Defaulters
          </h1>
          <TimeDisplay />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* As-of date + refresh */}
        <div className={`p-4 sm:p-6 rounded-lg shadow-md ${card}`}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className="block font-bold text-lg mb-2 text-orange-500">
                As of
              </label>
              <input
                type="date"
                value={asOf}
                max={localToday()}
                onChange={(e) => setAsOf(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData(asOf)}
                className={`${input} text-lg font-bold`}
              />
            </div>
            <button
              onClick={() => fetchData(asOf)}
              disabled={loading || !asOf}
              className={`px-5 py-2 rounded-md flex items-center justify-center gap-2 text-white transition-colors ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </button>
            <p className="text-sm opacity-70 sm:ml-auto sm:max-w-md">
              Counts installments that fell due <b>before</b> this date and are
              still unpaid, net of every payment received up to it. A borrower
              who has not paid yet today is not flagged.
            </p>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-4 rounded-lg shadow-md ${card}`}>
              <p className="text-sm opacity-70">Overdue accounts</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-500">
                {summary.count}
              </p>
            </div>
            <div className={`p-4 rounded-lg shadow-md ${card}`}>
              <p className="text-sm opacity-70">Total outstanding</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                {formatRupees(summary.totalOutstanding)}
              </p>
              <p className="text-xs opacity-70">
                {formatRupees(summary.totalAmountDue)} due +{" "}
                {formatRupees(summary.totalLateFee)} late fees
              </p>
            </div>
            {(["medium", "high"] as OverdueSeverity[]).map((sev) => (
              <button
                key={sev}
                onClick={() =>
                  setSeverityFilter((cur) => (cur === sev ? "all" : sev))
                }
                className={`p-4 rounded-lg shadow-md text-left transition ${card} ${
                  severityFilter === sev ? "ring-2 ring-orange-500" : ""
                }`}
              >
                <p className="text-sm opacity-70">{SEVERITY_LABEL[sev]}</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {summary.bySeverity[sev].count}
                </p>
                <p className="text-xs opacity-70">
                  {formatRupees(summary.bySeverity[sev].amount)}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        {data && (
          <div className={`p-4 rounded-lg shadow-md ${card}`}>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search account or name"
                  className={`${input} w-full pl-9`}
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "all" | "daily" | "monthly")
                }
                className={input}
              >
                <option value="all">All types</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={input}
              >
                <option value="all">All files</option>
                {data.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as "all" | OverdueSeverity)
                }
                className={input}
              >
                <option value="all">Any age</option>
                {(Object.keys(SEVERITY_LABEL) as OverdueSeverity[]).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={exportCsv}
                disabled={rows.length === 0}
                className="px-4 py-2 rounded-md flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {data &&
          (rows.length > 0 ? (
            <div className={`rounded-lg shadow-md overflow-x-auto ${card}`}>
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className={darkMode ? "bg-gray-700" : "bg-orange-100"}>
                    <Th label="Account" k="accountNo" align="left" />
                    <Th label="Name" k="nameEnglish" align="left" />
                    <th className="p-3 font-semibold border-b text-left">
                      File
                    </th>
                    <Th label="Behind" k="daysOverdue" />
                    <Th label="Installments" k="installmentsBehind" />
                    <Th label="Amount due" k="amountDue" />
                    <Th label="Late fee" k="lateFee" />
                    <Th label="Outstanding" k="totalOutstanding" />
                    <Th label="Last paid" k="daysSinceLastPayment" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.loanId}
                      className={`${
                        darkMode
                          ? idx % 2 === 0
                            ? "bg-gray-800"
                            : "bg-gray-700/60"
                          : idx % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                      } hover:bg-orange-50 dark:hover:bg-orange-900/40 transition-colors`}
                    >
                      <td className="p-3 border-b font-bold">{r.accountNo}</td>
                      <td className="p-3 border-b">
                        <div className="font-medium">{r.nameEnglish}</div>
                        <div className="text-sm opacity-70">{r.nameGujarati}</div>
                      </td>
                      <td className="p-3 border-b text-sm">
                        <span className="capitalize">{r.loanType}</span>
                        <span className="opacity-70"> · {r.fileCategory}</span>
                      </td>
                      <td className="p-3 border-b text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-sm font-semibold ${
                            SEVERITY_BADGE[r.severity]
                          }`}
                        >
                          {r.daysOverdue} {r.daysOverdue === 1 ? "day" : "days"}
                        </span>
                      </td>
                      <td className="p-3 border-b text-right">
                        {r.installmentsBehind}
                        <span className="text-xs opacity-70">
                          {" "}
                          × {formatRupees(r.installmentAmount)}
                        </span>
                      </td>
                      <td className="p-3 border-b text-right">
                        {formatRupees(r.amountDue)}
                      </td>
                      <td className="p-3 border-b text-right">
                        {r.lateFee > 0 ? formatRupees(r.lateFee) : "—"}
                      </td>
                      <td className="p-3 border-b text-right font-bold text-red-600 dark:text-red-400">
                        {formatRupees(r.totalOutstanding)}
                      </td>
                      <td className="p-3 border-b text-right text-sm">
                        {r.lastPaymentDate ? (
                          <>
                            {formatDate(r.lastPaymentDate)}
                            <div className="text-xs opacity-70">
                              {r.daysSinceLastPayment} days ago
                            </div>
                          </>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            Never
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr
                    className={`font-bold ${
                      darkMode ? "bg-gray-900" : "bg-gray-100"
                    }`}
                  >
                    <td className="p-3" colSpan={7}>
                      Showing {rows.length} of {data.rows.length} accounts
                    </td>
                    <td className="p-3 text-right text-red-600 dark:text-red-400">
                      {formatRupees(shownTotal)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center p-8 rounded-lg shadow-md ${card}`}>
              <p className="text-lg font-medium">
                {data.rows.length === 0
                  ? "No overdue accounts as of this date. 🎉"
                  : "No accounts match the current filters."}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
