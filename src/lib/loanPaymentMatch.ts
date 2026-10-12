import Loan from "@/models/Loan";

// The payments that belong to a loan: those saved against its loanId, plus payments whose
// original loan was deleted (re-created loan) but carry this loan's accountNo. Payments of a
// still-live loan never match by accountNo, even if that loan was renumbered and its old
// number reused. Keep this in step with the matching in /api/loansDoc GET.
export async function loanPaymentsFilter(loanId: string) {
  const loan = await Loan.findById(loanId, { accountNo: 1 }).lean<{ accountNo?: string } | null>();
  if (!loan?.accountNo) return { loanId };

  const liveLoanIds = (await Loan.find({}, { _id: 1 }).lean<{ _id: unknown }[]>()).map((l) => l._id);
  return {
    $or: [
      { loanId },
      { accountNo: String(loan.accountNo).trim(), loanId: { $nin: liveLoanIds } },
    ],
  };
}
