import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Check, X, AlertTriangle, RotateCw, CheckCircle } from "lucide-react";

interface SyncLog {
    _id: string;
    accountNo: string;
    amountPaid: number;
    syncStatus: "success" | "failed" | "pending" | "not_found" | "mismatch";
    syncError?: string;
    systemAmount?: number;
    verifiedAt?: string;
    verifiedBy?: string;
    loanDocId?: {
        nameGujarati: string;
        nameEnglish: string;
        accountNo: string;
    };
}

interface ReconciliationPanelProps {
    selectedDate: string;
    isOpen: boolean;
    onClose: () => void;
}

const ReconciliationPanel: React.FC<ReconciliationPanelProps> = ({
    selectedDate,
    isOpen,
    onClose,
}) => {
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState<string | null>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/sync-log?date=${selectedDate}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
            }
        } catch (error) {
            console.error("Error fetching sync logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, selectedDate]);

    const handleVerify = async (id: string) => {
        setIsVerifying(id);
        try {
            const response = await fetch("/api/sync-log", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action: "verify" }),
            });

            if (response.ok) {
                setLogs((prev) =>
                    prev.map((log) =>
                        log._id === id
                            ? { ...log, verifiedAt: new Date().toISOString() }
                            : log
                    )
                );
            }
        } catch (error) {
            console.error("Error verifying log:", error);
        } finally {
            setIsVerifying(null);
        }
    };

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch("/api/sync-collection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: selectedDate }),
            });
            if (response.ok) {
                const data = await response.json();
                alert(`Sync completed: ${data.successCount} matched.`);
                fetchLogs(); // Refresh logs
            } else {
                alert("Sync failed");
            }
        } catch (error) {
            console.error("Error syncing:", error);
            alert("Error syncing data");
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isOpen) return null;

    const stats = {
        total: logs.length,
        success: logs.filter((l) => l.syncStatus === "success").length,
        failed: logs.filter((l) => l.syncStatus === "failed").length,
        notFound: logs.filter((l) => l.syncStatus === "not_found").length,
        mismatch: logs.filter((l) => l.syncStatus === "mismatch").length,
        verified: logs.filter((l) => l.verifiedAt).length,
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                        📊 Reconciliation View
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-sm text-gray-500 font-medium">Total Syncs</div>
                        <div className="text-xl font-bold text-gray-800">{stats.total}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-green-600 font-medium">Matched</div>
                        <div className="text-xl font-bold text-green-600">
                            {stats.success}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-red-600 font-medium">Issues</div>
                        <div className="text-xl font-bold text-red-600">
                            {stats.failed + stats.notFound + stats.mismatch}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-blue-600 font-medium">Verified</div>
                        <div className="text-xl font-bold text-blue-600">
                            {stats.verified} / {stats.success}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">
                        Transactions for {selectedDate}
                    </h3>
                    <button
                        onClick={handleSyncAll}
                        disabled={isSyncing}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 mr-4"
                    >
                        <RotateCw size={16} className={`mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Checking..." : "Run Comparison"}
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                        <RotateCw size={16} className="mr-1" /> Refresh
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                        No transactions found for this date.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-3 text-sm font-bold text-gray-600 border-b">
                                        Account
                                    </th>
                                    <th className="p-3 text-sm font-bold text-gray-600 border-b text-right">
                                        Collection Amt
                                    </th>
                                    <th className="p-3 text-sm font-bold text-gray-600 border-b text-center">
                                        Status
                                    </th>
                                    <th className="p-3 text-sm font-bold text-gray-600 border-b text-center">
                                        Verify
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log._id} className="border-b hover:bg-gray-50">
                                        <td className="p-3">
                                            <div className="font-medium text-gray-800">
                                                {log.accountNo}
                                            </div>
                                            {log.loanDocId ? (
                                                <div className="text-xs text-gray-500">
                                                    {log.loanDocId.nameGujarati ||
                                                        log.loanDocId.nameEnglish}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-red-500">
                                                    Unknown Account
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-medium text-gray-800">
                                            {formatCurrency(log.amountPaid)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center">
                                                {log.syncStatus === "success" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <Check size={12} className="mr-1" /> Matched
                                                    </span>
                                                )}
                                                {log.syncStatus === "failed" && (
                                                    <span
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                                        title={log.syncError}
                                                    >
                                                        <X size={12} className="mr-1" /> Error
                                                    </span>
                                                )}
                                                {log.syncStatus === "not_found" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <X size={12} className="mr-1" /> Missing
                                                    </span>
                                                )}
                                                {log.syncStatus === "mismatch" && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                        <AlertTriangle size={12} className="mr-1" /> Mismatch
                                                    </span>
                                                )}

                                                {/* Error Message / Details */}
                                                {log.syncStatus === "mismatch" ? (
                                                    <span className="text-xs text-orange-600 mt-1">
                                                        Sys: {formatCurrency(log.systemAmount || 0)}
                                                    </span>
                                                ) : log.syncError && (
                                                    <span className="text-xs text-red-500 mt-1 max-w-[150px] truncate block">
                                                        {log.syncError}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {log.syncStatus === "success" ? (
                                                log.verifiedAt ? (
                                                    <span
                                                        className="text-green-600 flex justify-center items-center"
                                                        title={`Verified at ${new Date(
                                                            log.verifiedAt
                                                        ).toLocaleTimeString()}`}
                                                    >
                                                        <CheckCircle size={20} />
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleVerify(log._id)}
                                                        disabled={isVerifying === log._id}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {isVerifying === log._id ? "..." : "Verify"}
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReconciliationPanel;
