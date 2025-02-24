import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LoanSchema from '@/models/LoanSchema';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    // Calculate installment amount based on isDaily flag
    if (data.isDaily) {
      data.instAmount = data.amount / data.period; // Daily installment
    } else {
      data.instAmount = data.amount / (data.period / 30); // Monthly installment
    }

    const existingLoan = await LoanSchema.findOne({ accountNo: data.accountNo });
    if (existingLoan) {
      return NextResponse.json(
        { message: 'Loan with this account number already exists' },
        { status: 400 }
      );
    }

    const loan = await LoanSchema.create(data);
    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { message: 'Error creating loan', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    
    const loan = await LoanSchema.findOneAndUpdate(
      { accountNo: data.accountNo },
      data,
      { new: true, runValidators: true }
    );

    if (!loan) {
      return NextResponse.json(
        { message: 'Loan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { message: 'Error updating loan', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET method remains unchanged except for the `allAccounts` logic
export async function GET(req: Request) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const accountNo = url.searchParams.get('accountNo');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const allAccounts = url.searchParams.get('allAccounts');
    const totalAmount = url.searchParams.get('totalAmount'); 
    const monthlyTotal = url.searchParams.get('monthlyTotal'); 
    const dailyTotal = url.searchParams.get('dailyTotal');
    const monthlyAccountCount = url.searchParams.get('monthlyAccountCount');
    const dailyAccountCount = url.searchParams.get('dailyAccountCount'); 
    const overallTotal = url.searchParams.get('overallTotal');

    // Fetch total loan amount
    if (totalAmount === 'true') {
      const loans = await LoanSchema.find({}, { amount: 1, _id: 0 });
      const total = loans.reduce((sum, loan) => sum + loan.amount, 0);
      return NextResponse.json({ totalLoanAmount: total });
    }

    if (overallTotal === 'true') {
      const [monthlyAccounts, dailyAccounts] = await Promise.all([
        LoanSchema.aggregate([
          {
            $match: { isDaily: false }  // Filter for monthly loans
          },
          {
            $group: {
              _id: null,
              totalMonthlyAccounts: { $sum: 1 },
            },
          },
        ]),
        LoanSchema.aggregate([
          {
            $match: { isDaily: true }  // Filter for daily loans
          },
          {
            $group: {
              _id: null,
              totalDailyAccounts: { $sum: 1 },
            },
          },
        ]),
      ]);
      const [monthlyInstallments, dailyInstallments] = await Promise.all([
        LoanSchema.aggregate([
          {
            $match: { isDaily: false }  // Filter for monthly loans
          },
          {
            $group: {
              _id: null,
              totalMonthlyInstallments: { $sum: '$instAmount' }, // Use instAmount
            },
          },
        ]),
        LoanSchema.aggregate([
          {
            $match: { isDaily: true }  // Filter for daily loans
          },
          {
            $group: {
              _id: null,
              totalDailyInstallments: { $sum: '$instAmount' }, // Use instAmount
            },
          },
        ]),
      ]);
      return NextResponse.json({
        totalMonthlyAccounts: monthlyAccounts[0]?.totalMonthlyAccounts || 0,
        totalDailyAccounts: dailyAccounts[0]?.totalDailyAccounts || 0,
        totalMonthlyInstallments: monthlyInstallments[0]?.totalMonthlyInstallments || 0,
        totalDailyInstallments: dailyInstallments[0]?.totalDailyInstallments || 0,
      });
    }

    // Fetch total loans grouped by month
    if (monthlyTotal === 'true') {
      const loans = await LoanSchema.aggregate([
        {
          $match: { isDaily: false }  // Filter for monthly loans
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            totalAmount: { $sum: '$instAmount' } // Use instAmount
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      return NextResponse.json(loans);
    }

    // Fetch total loans grouped by day
    if (dailyTotal === 'true') {
      const loans = await LoanSchema.aggregate([
        {
          $match: { isDaily: true }  // Filter for daily loans
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' }
            },
            totalAmount: { $sum: '$instAmount' } // Use instAmount
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);
      return NextResponse.json(loans);
    }

    // Fetch total number of accounts created per month
    if (monthlyAccountCount === 'true') {
      const accounts = await LoanSchema.aggregate([
        {
          $match: { isDaily: false }  // Filter for monthly loans
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            totalAccounts: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      return NextResponse.json(accounts);
    }

    // Fetch total number of accounts created per day
    if (dailyAccountCount === 'true') {
      const accounts = await LoanSchema.aggregate([
        {
          $match: { isDaily: true }  // Filter for daily loans
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' }
            },
            totalAccounts: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);
      return NextResponse.json(accounts);
    }

    // Fetch all accounts with ALL fields
    if (allAccounts === 'true') {
      const loans = await LoanSchema.find(); // Removed projection to fetch all fields
      return NextResponse.json(loans);
    }

    // Existing logic for fetching by accountNo
    if (accountNo) {
      const loans = await LoanSchema.find({ accountNo });
      return NextResponse.json(loans);
    }

    // Existing date range logic
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { message: 'Both fromDate and toDate are required' },
        { status: 400 }
      );
    }
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: 'Invalid date format' },
        { status: 400 }
      );
    }
    const loans = await LoanSchema.find({
      date: { $gte: startDate, $lte: endDate },
    });
    if (!loans || loans.length === 0) {
      return NextResponse.json(
        { message: 'No loans found for the given date range' },
        { status: 404 }
      );
    }
    return NextResponse.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      {
        message: 'Error fetching loans',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}