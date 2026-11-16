import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ExtraCash from "@/models/ExtraCash";

const LOAN_TYPES = ["daily", "monthly", "pending"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/extra-cash?date=YYYY-MM-DD&loanType=daily[&category=Gajanand 1]
// Without category: every file of that loan type (used for the all-files total).
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const date = params.get("date");
    const loanType = params.get("loanType");
    const category = params.get("category");

    if (!date || !DATE_RE.test(date) || !loanType || !LOAN_TYPES.includes(loanType)) {
      return NextResponse.json({ error: "date (YYYY-MM-DD) and loanType are required" }, { status: 400 });
    }

    await dbConnect();
    const query: Record<string, string> = { date, loanType };
    if (category) query.category = category;

    const entries = await ExtraCash.find(query).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error fetching extra cash:", error);
    return NextResponse.json({ error: "Failed to fetch extra cash" }, { status: 500 });
  }
}

// POST { date, loanType, category, name, amount }
export async function POST(request: NextRequest) {
  try {
    const { date, loanType, category, name, amount } = await request.json();
    const numericAmount = Number(amount);

    if (
      !date || !DATE_RE.test(date) ||
      !LOAN_TYPES.includes(loanType) ||
      !category || !String(category).trim() ||
      !name || !String(name).trim() ||
      !Number.isFinite(numericAmount) || numericAmount === 0
    ) {
      return NextResponse.json(
        { error: "date, loanType, category, name and a non-zero amount are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const entry = await ExtraCash.create({
      date,
      loanType,
      category: String(category).trim(),
      name: String(name).trim(),
      amount: numericAmount,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error saving extra cash:", error);
    return NextResponse.json({ error: "Failed to save extra cash" }, { status: 500 });
  }
}
