"use client";
import { formatDayLabel } from "@/lib/daybook/istDate";
import { formatINR } from "@/lib/daybook/money";
import type { CollectionResponse } from "@/lib/daybook/types";
import Modal, { primaryBtn, secondaryBtn } from "./Modal";

interface Props {
  collection: CollectionResponse;
  onClose: () => void;
  onOpenCollectionBook: () => void;
}

export default function CollectionModal({ collection, onClose, onOpenCollectionBook }: Props) {
  const payments = collection.payments ?? [];
  return (
    <Modal
      title={`Collection Book · ${formatDayLabel(collection.from)}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onOpenCollectionBook}>Open Collection Book</button>
          <button className={primaryBtn} onClick={onClose} data-autofocus>Close</button>
        </>
      }
    >
      {payments.length === 0 ? (
        <p className="text-center py-6 text-gray-500">No collection on this day.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">
              <tr className="text-left">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2 w-28">A/C No</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 w-24">Time</th>
                <th className="px-3 py-2 w-36 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-1.5 text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-1.5 font-semibold">{p.accountNo}</td>
                  <td className="px-3 py-1.5">{p.name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-1.5 text-gray-500 tabular-nums">{p.time ? p.time.slice(0, 5) : ""}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-green-700 dark:text-green-400 font-semibold">
                    {formatINR(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700/60 font-semibold">
              <tr>
                <td colSpan={4} className="px-3 py-2">
                  Total ({payments.length} {payments.length === 1 ? "payment" : "payments"})
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-400">{formatINR(collection.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}
