import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Loan from "@/models/Loan";
import Payment from "@/models/PaymentDoc";

// Define interfaces for the data structures
interface LoanDocument {
  _id: string;
  loanType: string;
  fileCategory: string;
  index: number;
  accountNo: string;
  nameGujarati: string;
  nameEnglish: string;
  installmentAmount: number;
  lateAmount: number;
  receivedDate: Date;
  totalToBePaid?: number;
  toObject(): Record<string, unknown>;
}

interface PaymentDocument {
  loanId: string;
  date: Date;
  amount: number;
}

interface QueryParams {
  loanType?: string;
  fileCategory?: string;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const loanType = searchParams.get("type");
    const fileCategory = searchParams.get("category");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const query: QueryParams = {};
    if (loanType) query.loanType = loanType;
    if (fileCategory) query.fileCategory = fileCategory;

    const loans = await Loan.find(query).sort({ index: 1 });

    const paymentsResponse = await fetch(
      `${request.nextUrl.origin}/api/loanPayments?date=${date}`,
      { method: "GET" }
    );
    const { payments }: { payments: PaymentDocument[] } = await paymentsResponse.json();

    const loansWithHistory = loans.map((loan: LoanDocument) => {
      const loanPayments = payments.filter((p: PaymentDocument) => p.loanId.toString() === loan._id.toString());
      const totalPaid = loanPayments.reduce((sum: number, p: PaymentDocument) => sum + p.amount, 0);
      return {
        ...loan.toObject(),
        paymentHistory: loanPayments.map((p: PaymentDocument) => ({
          date: new Date(p.date).toISOString().split("T")[0],
          amount: p.amount,
        })),
        paymentReceivedToday: loanPayments
          .filter((p: PaymentDocument) => new Date(p.date).toISOString().split("T")[0] === date)
          .reduce((sum: number, p: PaymentDocument) => sum + p.amount, 0),
        paymentStatus: loan.loanType === "pending" ? (loan.totalToBePaid || 1000) - totalPaid : undefined
      };
    });

    return NextResponse.json({ loans: loansWithHistory });
  } catch (error: unknown) {
    console.error("Error fetching loans:", error);
    return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const data: Record<string, unknown> = await request.json();

    const requiredFields = ['accountNo', 'nameGujarati', 'nameEnglish', 'loanType', 'fileCategory', 'index'];
    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate loanType
    if (!["daily", "monthly", "pending"].includes(data.loanType as string)) {
      return NextResponse.json(
        { error: "loanType must be 'daily', 'monthly', or 'pending'" },
        { status: 400 }
      );
    }

    // For pending loans
    if (data.loanType === "pending") {
      data.lateAmount = 0;
      if (data.totalToBePaid === undefined || (data.totalToBePaid as number) < 0) {
        return NextResponse.json(
          { error: "totalToBePaid must be provided and cannot be negative for pending loans" },
          { status: 400 }
        );
      }
      data.totalToBePaid = data.totalToBePaid || 1000;
    }

    if (data.loanType !== "pending" && (data.installmentAmount === undefined || (data.installmentAmount as number) < 0)) {
      return NextResponse.json(
        { error: "installmentAmount must be provided and cannot be negative for daily/monthly loans" },
        { status: 400 }
      );
    }

    if ((data.index as number) < 1 || (data.index as number) > 84) {
      return NextResponse.json(
        { error: "Index must be between 1 and 84" },
        { status: 400 }
      );
    }

    const existingLoan = await Loan.findOne({ accountNo: data.accountNo });
    if (existingLoan) {
      return NextResponse.json(
        { error: "Account number already exists" },
        { status: 400 }
      );
    }

    const existingLoanAtIndex = await Loan.findOne({ 
      index: data.index,
      loanType: data.loanType,
      fileCategory: data.fileCategory
    });
    
    if (existingLoanAtIndex) {
      return NextResponse.json(
        { error: `Index ${data.index} is already taken in this ${data.loanType} file` },
        { status: 400 }
      );
    }

    const loan = new Loan({
      ...data,
      installmentAmount: data.installmentAmount || 0,
      receivedDate: data.receivedDate ? new Date(data.receivedDate as string) : new Date(),
      receivedAmount: data.receivedAmount || 0,
      lateAmount: data.loanType === "pending" ? 0 : (data.lateAmount || 0),
      totalToBePaid: data.loanType === "pending" ? (data.totalToBePaid || 1000) : undefined,
      paymentReceivedToday: data.paymentReceivedToday || 0,
      index: data.index,
    });

    await loan.save();

    return NextResponse.json(
      { message: "Loan created successfully", loan },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating loan:", error);
    return NextResponse.json(
      { error: "Failed to create loan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const { pathname } = request.nextUrl;
    const pathId = pathname.split("/").pop();
    
    const data: Record<string, unknown> = await request.json();
    const { 
      id = pathId, 
      accountNo, 
      nameGujarati, 
      nameEnglish, 
      installmentAmount, 
      fileCategory, 
      index, 
      receivedDate, 
      loanType, 
      lateAmount,
      totalToBePaid,
      paymentReceivedToday
    } = data;

    if (!id) {
      return NextResponse.json({ error: "Loan ID is required" }, { status: 400 });
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (accountNo !== undefined) {
      const existingLoan = await Loan.findOne({ accountNo, _id: { $ne: id } });
      if (existingLoan) {
        return NextResponse.json({ error: "Account number already exists" }, { status: 400 });
      }
      loan.accountNo = accountNo as string;
    }
    
    if (index !== undefined) {
      if ((index as number) < 1 || (index as number) > 84) {
        return NextResponse.json({ error: "Index must be between 1 and 84" }, { status: 400 });
      }
      
      const currentLoanType = loanType !== undefined ? loanType : loan.loanType;
      const currentFileCategory = fileCategory !== undefined ? fileCategory : loan.fileCategory;
      
      const existingLoanAtIndex = await Loan.findOne({ 
        index: index as number,
        loanType: currentLoanType as string,
        fileCategory: currentFileCategory as string,
        _id: { $ne: id } 
      });
      
      if (existingLoanAtIndex) {
        return NextResponse.json({ 
          error: `Index ${index} is already taken in this ${currentLoanType} file by another loan (${existingLoanAtIndex.nameEnglish || existingLoanAtIndex.nameGujarati})` 
        }, { status: 400 });
      }
      loan.index = index as number;
    }
    
    if (loanType !== undefined) {
      if (!["daily", "monthly", "pending"].includes(loanType as string)) {
        return NextResponse.json(
          { error: "loanType must be 'daily', 'monthly', or 'pending'" },
          { status: 400 }
        );
      }
      
      if (loanType !== loan.loanType && index) {
        const currentFileCategory = fileCategory !== undefined ? fileCategory : loan.fileCategory;
        const existingLoanAtIndex = await Loan.findOne({ 
          index: index as number,
          loanType: loanType as string,
          fileCategory: currentFileCategory as string,
          _id: { $ne: id } 
        });
        
        if (existingLoanAtIndex) {
          return NextResponse.json({ 
            error: `Index ${index} is already taken in the ${loanType} file by another loan (${existingLoanAtIndex.nameEnglish || existingLoanAtIndex.nameGujarati})` 
          }, { status: 400 });
        }
      }
      
      loan.loanType = loanType as string;
    }
    
    if (fileCategory !== undefined && fileCategory !== loan.fileCategory) {
      const currentIndex = index !== undefined ? index : loan.index;
      const currentLoanType = loanType !== undefined ? loanType : loan.loanType;
      
      const existingLoanAtIndex = await Loan.findOne({ 
        index: currentIndex as number,
        loanType: currentLoanType as string,
        fileCategory: fileCategory as string,
        _id: { $ne: id } 
      });
      
      if (existingLoanAtIndex) {
        return NextResponse.json({ 
          error: `Index ${currentIndex} is already taken in the ${currentLoanType} file for category ${fileCategory} by another loan (${existingLoanAtIndex.nameEnglish || existingLoanAtIndex.nameGujarati})` 
        }, { status: 400 });
      }
      
      loan.fileCategory = fileCategory as string;
    }

    if (installmentAmount !== undefined) {
      const currentLoanType = loanType !== undefined ? loanType : loan.loanType;
      if (currentLoanType !== "pending" && (installmentAmount as number) < 0) {
        return NextResponse.json(
          { error: "installmentAmount cannot be negative for daily/monthly loans" },
          { status: 400 }
        );
      }
      loan.installmentAmount = installmentAmount as number;
    }

    const currentLoanType = loanType !== undefined ? loanType : loan.loanType;
    if (currentLoanType === "pending") {
      loan.lateAmount = 0;
      if (totalToBePaid !== undefined) {
        if ((totalToBePaid as number) < 0) {
          return NextResponse.json(
            { error: "totalToBePaid cannot be negative" },
            { status: 400 }
          );
        }
        loan.totalToBePaid = totalToBePaid as number;
      }
      
      if (paymentReceivedToday !== undefined && (paymentReceivedToday as number) > 0) {
        loan.totalToBePaid = (loan.totalToBePaid || 1000) - (paymentReceivedToday as number);
        loan.paymentReceivedToday = paymentReceivedToday as number;
      }
    } else if (lateAmount !== undefined) {
      loan.lateAmount = lateAmount as number;
    }

    if (nameGujarati !== undefined) loan.nameGujarati = nameGujarati as string;
    if (nameEnglish !== undefined) loan.nameEnglish = nameEnglish as string;
    if (receivedDate !== undefined) loan.receivedDate = new Date(receivedDate as string);

    await loan.save();

    return NextResponse.json({ success: true, loan });
  } catch (error: unknown) {
    console.error("Error updating loan:", error);
    return NextResponse.json({ error: "Failed to update loan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { pathname } = request.nextUrl;
    const id = pathname.split("/").pop();
    const deletePayments = request.headers.get("X-Delete-Payments") === "true";

    if (!id) {
      return NextResponse.json({ error: "Loan ID is required" }, { status: 400 });
    }

    const loan = await Loan.findByIdAndDelete(id);
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    if (deletePayments) {
      await Payment.deleteMany({ loanId: id });
      console.log(`Deleted payment histories for loan ${id}`);
    } else {
      console.log(`Preserved payment histories for loan ${id}`);
    }

    return NextResponse.json({ success: true, paymentsDeleted: deletePayments });
  } catch (error: unknown) {
    console.error("Error deleting loan:", error);
    return NextResponse.json({ error: "Failed to delete loan" }, { status: 500 });
  }
}