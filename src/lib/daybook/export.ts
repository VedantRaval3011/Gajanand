import type { CollectionResponse, DaybookEntryView, Totals } from "./types";
import { formatDayLabel } from "./istDate";

type Row = { collection?: boolean; date: string; description: string; category: string; income: number | ""; expense: number | ""; by: string };

export async function exportEntriesWorkbook(opts: {
  entries: DaybookEntryView[];
  /** Totals to print; already include the collection when it is passed. */
  totals: Totals;
  from: string;
  to: string;
  balance: { opening: number; closing: number } | null;
  filtered: boolean;
  /** Collection Book totals to list as one income row per day. */
  collection?: CollectionResponse | null;
  /** Book name for the title, sheet and file, e.g. "Day Book". Defaults to "Day Book". */
  bookName?: string;
}) {
  const { entries, totals, from, to, balance, filtered, collection, bookName = "Day Book" } = opts;
  const XLSX = await import("xlsx");
  const period = from === to ? formatDayLabel(from) : `${formatDayLabel(from)} to ${formatDayLabel(to)}`;

  const list: Row[] = entries.map((e) => ({
    date: e.date,
    description: e.description,
    category: e.category,
    income: e.type === "income" ? e.amount : "",
    expense: e.type === "expense" ? e.amount : "",
    by: e.createdBy,
  }));
  for (const d of collection?.days ?? []) {
    if (!d.count) continue;
    list.push({
      collection: true,
      date: d.date,
      description: `Collection Book (${d.count} ${d.count === 1 ? "payment" : "payments"})`,
      category: "Collection",
      income: d.total,
      expense: "",
      by: "",
    });
  }
  // Stable sort keeps entry order within a day; collection rows go first on their day.
  list.sort((a, b) => a.date.localeCompare(b.date) || Number(!!b.collection) - Number(!!a.collection));

  const rows: (string | number)[][] = [
    [`Gajanand Finance - ${bookName}`],
    [`Period: ${period}`],
    filtered ? ["Filtered list"] : collection ? ["Includes Collection Book collection"] : [],
    [],
    ["Sr", "Date", "Description", "Category", "Type", "Income", "Expense", "Added by"],
  ];
  list.forEach((r, i) =>
    rows.push([i + 1, formatDayLabel(r.date), r.description, r.category, r.income !== "" ? "Income" : "Expense", r.income, r.expense, r.by])
  );
  rows.push([], ["", "", "", "", "Total", totals.income, totals.expense], ["", "", "", "", "Net (Income - Expense)", totals.net]);
  if (balance && !filtered) {
    rows.push(["", "", "", "", "Opening balance", balance.opening], ["", "", "", "", "Closing balance", balance.closing]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, bookName);
  // "Day Book" -> daybook-..., "Personal Day Book" -> personal-daybook-...
  const filePrefix = bookName.toLowerCase().replace(/day book/, "daybook").replace(/\s+/g, "-");
  XLSX.writeFile(wb, `${filePrefix}-${from === to ? from : `${from}-to-${to}`}${filtered ? "-filtered" : ""}.xlsx`);
}
