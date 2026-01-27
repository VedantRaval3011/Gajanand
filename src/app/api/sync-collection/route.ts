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

        // Group payments by Account Number
        const groupedPayments = new Map<string, {
            accountNo: string;
            amountPaid: number;
            paymentIds: string[];
            paymentDate: Date;
        }>();

        for (const payment of payments) {
            if (!groupedPayments.has(payment.accountNo)) {
                groupedPayments.set(payment.accountNo, {
                    accountNo: payment.accountNo,
                    amountPaid: 0,
                    paymentIds: [],
                    paymentDate: payment.paymentDate
                });
            }
            const group = groupedPayments.get(payment.accountNo)!;
            group.amountPaid += payment.amountPaid;
            group.paymentIds.push(payment._id as string);
        }

        let successCount = 0;
        let failedCount = 0;

        // 2. Iterate and sync (Comparison Mode)
        for (const paymentGroup of Array.from(groupedPayments.values())) {
            try {
                const loanDoc = await Loan.findOne({ accountNo: paymentGroup.accountNo });

                if (loanDoc) {
                    // Find matching System Transaction (LoanPayment)
                    const systemPayment = await LoanPayment.findOne({
                        loanId: loanDoc._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                    });

                    // Check for existing log to update or create new
                    const existingLog = await SyncLog.findOne({
                        accountNo: paymentGroup.accountNo,
                        paymentDate: {
                            $gte: startOfDay,
                            $lte: endOfDay,
                        }
                    });

                    let status = "pending";
                    let error = undefined;
                    let sysAmount = undefined;
                    let verifiedDate = undefined;
                    let verifier = undefined;

                    if (systemPayment) {
                        if (systemPayment.amount === paymentGroup.amountPaid) {
                            status = "success";
                            verifiedDate = new Date(); // Auto-verify matches
                            verifier = "system-match";
                        } else {
                            status = "mismatch";
                            error = `Amount mismatch: Collection ₹${paymentGroup.amountPaid} vs System ₹${systemPayment.amount}`;
                            sysAmount = systemPayment.amount;
                        }
                    } else {
                        status = "not_found";
                        error = "Transaction missing in system";
                    }

                    if (existingLog) {
                        existingLog.syncStatus = status as any;
                        existingLog.syncError = error;
                        existingLog.systemAmount = sysAmount;
                        existingLog.amountPaid = paymentGroup.amountPaid;
                        existingLog.paymentIds = paymentGroup.paymentIds;

                        if (verifiedDate) {
                            existingLog.verifiedAt = verifiedDate;
                            existingLog.verifiedBy = verifier;
                        } else if (status !== 'success' && existingLog.syncStatus === 'success') {
                            existingLog.verifiedAt = undefined;
                            existingLog.verifiedBy = undefined;
                        }

                        existingLog.loanDocId = loanDoc._id;
                        existingLog.loanPaymentId = systemPayment ? systemPayment._id : undefined;
                        await existingLog.save();
                    } else {
                        await SyncLog.create({
                            accountNo: paymentGroup.accountNo,
                            paymentDate: paymentGroup.paymentDate,
                            amountPaid: paymentGroup.amountPaid,
                            paymentIds: paymentGroup.paymentIds,
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
                    else failedCount++;

                } else {
                    // Log missing loan
                    const existingLog = await SyncLog.findOne({
                        accountNo: paymentGroup.accountNo,
                        paymentDate: {
                            $gte: startOfDay,
                            $lte: endOfDay,
                        }
                    });

                    const errorMsg = "No matching loan found for account";

                    if (existingLog) {
                        existingLog.syncStatus = "failed";
                        existingLog.syncError = errorMsg;
                        existingLog.amountPaid = paymentGroup.amountPaid;
                        existingLog.paymentIds = paymentGroup.paymentIds;
                        existingLog.save();
                    } else {
                        await SyncLog.create({
                            accountNo: paymentGroup.accountNo,
                            paymentDate: paymentGroup.paymentDate,
                            amountPaid: paymentGroup.amountPaid,
                            paymentIds: paymentGroup.paymentIds,
                            syncStatus: "failed",
                            syncError: errorMsg,
                        });
                    }
                    failedCount++;
                }
            } catch (error) {
                console.error(`Error processing payment group ${paymentGroup.accountNo}:`, error);
                failedCount++;
            }
        }

        // 3. Cleanup: Remove logs for accounts that are no longer in the current payment list for this date
        const currentAccountNos = Array.from(groupedPayments.keys());
        const cleanupResult = await SyncLog.deleteMany({
            paymentDate: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
            accountNo: { $nin: currentAccountNos }
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
