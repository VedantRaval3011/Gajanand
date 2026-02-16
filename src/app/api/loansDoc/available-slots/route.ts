import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Loan from "@/models/Loan";

interface LoanDocument {
    index: number;
}

/**
 * GET /api/loansDoc/available-slots
 * Fetches available (empty) slot indexes in a target file category
 * 
 * Query params:
 * - loanType: 'daily' | 'monthly' | 'pending'
 * - fileCategory: e.g., 'Gajanand 4'
 * 
 * Returns: { availableSlots: number[] }
 */
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const searchParams = request.nextUrl.searchParams;
        const loanType = searchParams.get("loanType");
        const fileCategory = searchParams.get("fileCategory");

        if (!loanType || !fileCategory) {
            return NextResponse.json(
                { error: "loanType and fileCategory are required" },
                { status: 400 }
            );
        }

        // Get all loans in the target file category
        const existingLoans = await Loan.find({
            loanType,
            fileCategory,
        }).select("index");

        // Get occupied indexes
        const occupiedIndexes = new Set(
            existingLoans.map((loan: LoanDocument) => loan.index)
        );

        // Generate list of available slots (1-90)
        const availableSlots: number[] = [];
        for (let i = 1; i <= 90; i++) {
            if (!occupiedIndexes.has(i)) {
                availableSlots.push(i);
            }
        }

        return NextResponse.json({
            availableSlots,
            totalSlots: 90,
            occupiedCount: occupiedIndexes.size,
            availableCount: availableSlots.length
        });
    } catch (error: unknown) {
        console.error("Error fetching available slots:", error);
        return NextResponse.json(
            { error: "Failed to fetch available slots" },
            { status: 500 }
        );
    }
}
