import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/models/Payment";
import Loan from "@/models/Loan"; // This is LoanDoc
import LoanPayment from "@/models/PaymentDoc";
import SyncLog from "@/models/SyncLog";

export async function POST(request: NextRequest) {
    await dbConnect();

    try {
        const { date } = await request.json();

        if (!date) {
            return NextResponse.json({ message: "Date is required" }, { status: 400 });
        }

        const selectedDate = new Date(date);
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Fetch all payments from Collection Book for this date
        const payments = await Payment.find({
            paymentDate: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        let successCount = 0;
        let failedCount = 0;

        // 2. Iterate and sync
        // 2. Iterate and sync (Comparison Mode)
        for (const payment of payments) {
            try {
                const loanDoc = await Loan.findOne({ accountNo: payment.accountNo });

                if (loanDoc) {
                    // Find matching System Transaction (LoanPayment)
                    // We look for a payment for this loan on this date
                    const systemPayment = await LoanPayment.findOne({
                        loanId: loanDoc._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                    });

                    // Check for existing log to update or create new
                    const existingLog = await SyncLog.findOne({
                        paymentId: payment._id,
                    });

                    let status = "pending";
                    let error = undefined;
                    let sysAmount = undefined;
                    let verifiedDate = undefined;
                    let verifier = undefined;

                    if (systemPayment) {
                        if (systemPayment.amount === payment.amountPaid) {
                            status = "success";
                            verifiedDate = new Date(); // Auto-verify matches
                            verifier = "system-match";
                        } else {
                            status = "mismatch";
                            error = `Amount mismatch: Collection ₹${payment.amountPaid} vs System ₹${systemPayment.amount}`;
                            sysAmount = systemPayment.amount;
                        }
                    } else {
                        status = "not_found";
                        error = "Transaction missing in system";
                    }

                    if (existingLog) {
                        existingLog.syncStatus = status;
                        existingLog.syncError = error;
                        existingLog.systemAmount = sysAmount;
                        if (verifiedDate) {
                            existingLog.verifiedAt = verifiedDate;
                            existingLog.verifiedBy = verifier;
                        } else {
                            // Reset verification if it became a mismatch/missing (optional, but safer)
                            existingLog.verifiedAt = undefined;
                            existingLog.verifiedBy = undefined;
                        }
                        existingLog.loanDocId = loanDoc._id;
                        existingLog.loanPaymentId = systemPayment ? systemPayment._id : undefined;
                        await existingLog.save();
                    } else {
                        await SyncLog.create({
                            paymentId: payment._id,
                            accountNo: payment.accountNo,
                            paymentDate: payment.paymentDate,
                            amountPaid: payment.amountPaid,
                            loanDocId: loanDoc._id,
                            loanPaymentId: systemPayment ? systemPayment._id : undefined,
                            syncStatus: status,
                            syncError: error,
                            systemAmount: sysAmount,
                            verifiedAt: verifiedDate,
                            verifiedBy: verifier,
                        });
                    }

                    if (status === "success") successCount++;
                    else failedCount++; // Count mismatches/missing as "failed" for the summary

                } else {
                    // Log missing loan (Account not found in system at all)
                    const existingLog = await SyncLog.findOne({
                        paymentId: payment._id,
                    });

                    const errorMsg = "No matching loan found for account";

                    if (existingLog) {
                        existingLog.syncStatus = "failed"; // Or specific "no_loan" status if needed
                        existingLog.syncError = errorMsg;
                        existingLog.verifiedAt = undefined;
                        existingLog.save();
                    } else {
                        await SyncLog.create({
                            paymentId: payment._id,
                            accountNo: payment.accountNo,
                            paymentDate: payment.paymentDate,
                            amountPaid: payment.amountPaid,
                            syncStatus: "failed",
                            syncError: errorMsg,
                        });
                    }
                    failedCount++;
                }
            } catch (error) {
                console.error(`Error processing payment ${payment._id}:`, error);
                failedCount++;
            }
        }

        // 3. Cleanup orphaned logs (logs that exist for this date but are not in the current payments list)
        const currentPaymentIds = payments.map(p => p._id);
        const cleanupResult = await SyncLog.deleteMany({
            paymentDate: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
            paymentId: { $nin: currentPaymentIds }
        });

        console.log(`Cleaned up ${cleanupResult.deletedCount} orphaned sync logs`);

        return NextResponse.json({
            message: "Bulk sync completed",
            successCount,
            failedCount,
        });
    } catch (error) {
        console.error("Bulk sync error:", error);
        return NextResponse.json(
            { message: "Bulk sync failed", error: String(error) },
            { status: 500 }
        );
    }
}
