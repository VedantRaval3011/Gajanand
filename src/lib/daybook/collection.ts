import { Payment } from '@/models/Payment';
import DaybookSetting from '@/models/DaybookSetting';
import { fromPaise } from './money';
import type { CollectionDay, CollectionPayment, CollectionResponse } from './types';

// Day boundaries are built exactly like GET /api/payments?date=... (the Collection
// Book), so the Day Book always shows the same collection as that screen.
function dayBounds(day: string) {
  const d = new Date(day);
  const start = new Date(d.setHours(0, 0, 0, 0));
  const end = new Date(d.setHours(23, 59, 59, 999));
  return { start, end };
}

// The calendar day a payment falls on, in the same timezone dayBounds uses.
const serverTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

async function totalPaiseBetween(fromDay: string, toDayExclusive: string): Promise<number> {
  if (fromDay >= toDayExclusive) return 0;
  const [row] = await Payment.aggregate<{ total: number }>([
    { $match: { paymentDate: { $gte: dayBounds(fromDay).start, $lt: dayBounds(toDayExclusive).start } } },
    { $group: { _id: null, total: { $sum: { $round: [{ $multiply: ['$amountPaid', 100] }, 0] } } } },
  ]);
  return row?.total ?? 0;
}

export async function getCollection(from: string, to: string): Promise<CollectionResponse> {
  const match = { paymentDate: { $gte: dayBounds(from).start, $lte: dayBounds(to).end } };

  const [dayRows, setting] = await Promise.all([
    Payment.aggregate<{ _id: string; total: number; count: number }>([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate', timezone: serverTimeZone() } },
          total: { $sum: { $round: [{ $multiply: ['$amountPaid', 100] }, 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    DaybookSetting.findOne({ key: 'default' }).lean<{ asOfDate: string } | null>(),
  ]);

  const days: CollectionDay[] = dayRows.map((r) => ({ date: r._id, total: fromPaise(r.total), count: r.count }));
  const totalPaise = dayRows.reduce((s, r) => s + r.total, 0);

  // The account-wise list is only sent for a single day; a range sends day totals.
  let payments: CollectionPayment[] | null = null;
  if (from === to) {
    const rows = await Payment.aggregate<{
      _id: { toString(): string };
      accountNo: string;
      amountPaid: number;
      paymentTime?: string;
      name?: string;
    }>([
      { $match: match },
      { $sort: { paymentDate: 1, _id: 1 } },
      { $lookup: { from: 'loans', localField: 'accountNo', foreignField: 'accountNo', as: 'loan' } },
      {
        $project: {
          accountNo: 1,
          amountPaid: 1,
          paymentTime: 1,
          name: { $ifNull: [{ $first: '$loan.nameEnglish' }, ''] },
        },
      },
    ]);
    payments = rows.map((r) => ({
      _id: r._id.toString(),
      accountNo: r.accountNo,
      name: r.name ?? '',
      amount: r.amountPaid,
      time: r.paymentTime ?? '',
    }));
  }

  // Collection received between the opening-balance date and `from`, so the
  // opening and closing balances can include collection too.
  const beforePaise = setting && from >= setting.asOfDate ? await totalPaiseBetween(setting.asOfDate, from) : 0;

  return {
    from,
    to,
    total: fromPaise(totalPaise),
    count: dayRows.reduce((s, r) => s + r.count, 0),
    days,
    payments,
    beforeFrom: fromPaise(beforePaise),
  };
}

