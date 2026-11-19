export type EntryType = 'income' | 'expense';

export interface UserRef {
  userId: string;
  username: string;
}

export interface DaybookEntryView {
  _id: string;
  date: string; // 'YYYY-MM-DD' (IST calendar day)
  type: EntryType;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface DayTotal extends Totals {
  date: string;
}

export interface DaybookSettingView {
  openingBalance: number;
  asOfDate: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DaybookListResponse {
  from: string;
  to: string;
  today: string;
  entries: DaybookEntryView[];
  totals: Totals;
  days: DayTotal[];
  /** Only present when an opening balance is set and `from` is on/after its date. */
  balance: { opening: number; closing: number } | null;
  setting: DaybookSettingView | null;
  categories: string[];
}

export interface EntryInput {
  date: string;
  type: EntryType;
  category: string;
  description: string;
  amount: number;
}

export interface ApiErrorBody {
  message: string;
  code?: string;
  field?: string;
  [key: string]: unknown;
}

/** Collection Book payments shown in the Day Book when "Include collection" is on. */
export interface CollectionDay {
  date: string; // 'YYYY-MM-DD'
  total: number;
  count: number;
}

export interface CollectionPayment {
  _id: string;
  accountNo: string;
  name: string;
  amount: number;
  time: string;
}

export interface CollectionResponse {
  from: string;
  to: string;
  total: number;
  count: number;
  days: CollectionDay[];
  /** Account-wise list; only sent when from === to. */
  payments: CollectionPayment[] | null;
  /** Collection from the opening-balance date up to (not including) `from`. */
  beforeFrom: number;
}
