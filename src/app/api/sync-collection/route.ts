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
        for (const payment of payments) {
            try {
                const loanDoc = await Loan.findOne({ accountNo: payment.accountNo });

                if (loanDoc) {
                    // Check/Create/Update LoanPayment
                    const existingLoanPayment = await LoanPayment.findOne({
                        loanId: loanDoc._id,
                        date: { $gte: startOfDay, $lte: endOfDay },
                    });

                    let loanPaymentId;

                    if (existingLoanPayment) {
                        existingLoanPayment.amount = payment.amountPaid;
                        await existingLoanPayment.save();
                        loanPaymentId = existingLoanPayment._id;
                    } else {
                        const newLoanPayment = await LoanPayment.create({
                            loanId: loanDoc._id,
                            accountNo: payment.accountNo,
                            amount: payment.amountPaid,
                            date: payment.paymentDate,
                        });
                        loanPaymentId = newLoanPayment._id;
                    }

                    // Check for existing log to update or create new
                    const existingLog = await SyncLog.findOne({
                        paymentId: payment._id,
                    });

                    if (existingLog) {
                        existingLog.syncStatus = "success";
                        existingLog.verifiedAt = new Date(); // Auto-verify
                        existingLog.verifiedBy = "system-bulk-sync";
                        existingLog.loanDocId = loanDoc._id;
                        existingLog.loanPaymentId = loanPaymentId;
                        await existingLog.save();
                    } else {
                        await SyncLog.create({
                            paymentId: payment._id,
                            accountNo: payment.accountNo,
                            paymentDate: payment.paymentDate,
                            amountPaid: payment.amountPaid,
                            loanDocId: loanDoc._id,
                            loanPaymentId: loanPaymentId,
                            syncStatus: "success",
                            verifiedAt: new Date(), // Auto-verify
                            verifiedBy: "system-bulk-sync",
                        });
                    }
                    successCount++;
                } else {
                    // Log missing loan
                    const existingLog = await SyncLog.findOne({
                        paymentId: payment._id,
                    });

                    if (existingLog) {
                        existingLog.syncStatus = "not_found";
                        existingLog.syncError = "No matching loan found";
                        await existingLog.save();
                    } else {
                        await SyncLog.create({
                            paymentId: payment._id,
                            accountNo: payment.accountNo,
                            paymentDate: payment.paymentDate,
                            amountPaid: payment.amountPaid,
                            syncStatus: "not_found",
                            syncError: "No matching loan found",
                        });
                    }
                    failedCount++;
                }
            } catch (error) {
                console.error(`Error syncing payment ${payment._id}:`, error);
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
