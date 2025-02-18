import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Payment } from '@/models/Payment';

export async function POST(req: Request) {
    try {
      await dbConnect();
      const body = await req.json();
      
      const { accountNo, date, amountPaid, lateAmount, remainingAmount } = body;
      
      // Validate required fields
      if (!accountNo || !date || typeof amountPaid !== 'number') {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
  
      const payment = await Payment.create({
        accountNo,
        date: new Date(date),
        amountPaid,
        lateAmount,
        remainingAmount
      });
  
      return NextResponse.json(payment, { status: 201 });
    } catch (error) {
      console.error('Error creating payment history:', error);
      return NextResponse.json(
        { error: 'Error creating payment history' },
        { status: 500 }
      );
    }
}

export async function GET(req: Request) {
  try {
    // Connect to the database
    await dbConnect();

    // Extract the year query parameter
    const url = new URL(req.url);
    const yearParam = url.searchParams.get('year');

    // Validate that the year parameter is present and not null
    if (!yearParam) {
      return NextResponse.json(
        { error: 'Missing year parameter' },
        { status: 400 }
      );
    }

    // Parse the year as an integer
    const year = parseInt(yearParam, 10);

    // Validate that the year is a valid number
    if (isNaN(year)) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    // Define the date range for the entire year
    const startDate = new Date(year, 0, 1); // First day of January
    const endDate = new Date(year + 1, 0, 1); // First day of January next year

    // Fetch payments within the specified year and group by month and accountNo
    const payments = await Payment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$paymentDate' }, // Extract month from paymentDate
            accountNo: '$accountNo'
          },
          totalAmountPaid: { $sum: '$amountPaid' }
        }
      },
      {
        $sort: { '_id.month': 1 } // Sort by month
      }
    ]);

    // Define the type for our data structure
    interface MonthlyTotals {
      [month: number]: {
        [accountNo: string]: number;
      };
    }

    // Transform the result into the desired format
    const totalsByMonthAndAccount: MonthlyTotals = {};
    payments.forEach((payment) => {
      const month = payment._id.month;
      const accountNo = payment._id.accountNo;

      if (!totalsByMonthAndAccount[month]) {
        totalsByMonthAndAccount[month] = {};
      }
      totalsByMonthAndAccount[month][accountNo] = payment.totalAmountPaid;
    });

    // Return the response
    return NextResponse.json(
      {
        year,
        totalsByMonthAndAccount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching payment totals:', error);
    return NextResponse.json(
      { error: 'Error fetching payment totals' },
      { status: 500 }
    );
  }
}


