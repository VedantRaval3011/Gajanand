import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SyncLog from "@/models/SyncLog";

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get("date");
        const status = searchParams.get("status");

        const query: any = {};
        if (date) {
            const selectedDate = new Date(date);
            const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
            query.paymentDate = { $gte: startOfDay, $lte: endOfDay };
        }

        if (status) {
            query.syncStatus = status;
        }

        const logs = await SyncLog.find(query)
            .sort({ createdAt: -1 })
            .populate('loanDocId', 'nameGujarati nameEnglish accountNo fileCategory loanType');

        return NextResponse.json({ logs });
    } catch (error) {
        console.error("Error fetching sync logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch sync logs" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        await dbConnect();
        const data = await request.json();
        const { id, action } = data;

        if (!id || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (action === "verify") {
            const log = await SyncLog.findByIdAndUpdate(
                id,
                {
                    verifiedAt: new Date(),
                    verifiedBy: "admin", // Ideally get from session
                },
                { new: true }
            );
            return NextResponse.json({ log });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error updating sync log:", error);
        return NextResponse.json(
            { error: "Failed to update sync log" },
            { status: 500 }
        );
    }
}
