import {create} from 'zustand';
import { toast } from 'react-hot-toast';

interface Payment {
  _id?: string;
  index: number;
  accountNo: string;
  amountPaid: number;
  paymentDate?: Date;
  lateAmount?: number;
  isDefaultAmount?: boolean;
}

interface LoanDetails {
  _id: string;
  holderName: string;
  holderAddress: string;
  city: string;
  loanDate: string;
  mAmount: number;
  instAmount: number;
  isDaily: boolean;
}

interface PaymentStore {
  // State
  payments: Payment[];
  selectedDate: Date;
  loanDetails: LoanDetails | null;
  receivedAmounts: { [key: string]: number };
  lateAmounts: { [key: string]: number };
  currentRow: number;
  
  // Actions
  setPayments: (payments: Payment[]) => void;
  setSelectedDate: (date: Date) => void;
  setLoanDetails: (details: LoanDetails | null) => void;
  setCurrentRow: (row: number) => void;
  updatePayment: (index: number, payment: Partial<Payment>) => void;
  addPayment: () => void;
  deletePayment: (index: number) => void;
  updateReceivedAmount: (accountNo: string, amount: number) => void;
  updateLateAmount: (accountNo: string, amount: number) => void;
  
  // Complex operations
  fetchLoanDetails: (accountNo: string) => Promise<LoanDetails | null>;
  calculateLateAmount: (details: LoanDetails, accountNo: string) => Promise<void>;
  savePayments: () => Promise<void>;
  fetchExistingPayments: (date: Date) => Promise<void>;
  resetState: () => void;
}

const usePaymentStore = create<PaymentStore>((set, get) => ({
  // Initial state
  payments: [{
    index: 1,
    accountNo: "",
    amountPaid: 0,
    paymentDate: new Date(),
    lateAmount: 0,
    isDefaultAmount: false,
  }],
  selectedDate: new Date(),
  loanDetails: null,
  receivedAmounts: {},
  lateAmounts: {},
  currentRow: 0,

  // Basic actions
  setPayments: (payments) => set({ payments }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoanDetails: (details) => set({ loanDetails: details }),
  setCurrentRow: (row) => set({ currentRow: row }),
  
  updatePayment: (index, paymentUpdate) => set((state) => ({
    payments: state.payments.map((payment, i) => 
      i === index ? { ...payment, ...paymentUpdate } : payment
    )
  })),

  addPayment: () => set((state) => ({
    payments: [...state.payments, {
      index: state.payments.length + 1,
      accountNo: "",
      amountPaid: 0,
      paymentDate: state.selectedDate,
      lateAmount: 0,
      isDefaultAmount: false,
    }]
  })),

  updateReceivedAmount: (accountNo, amount) => set((state) => ({
    receivedAmounts: { ...state.receivedAmounts, [accountNo]: amount }
  })),

  updateLateAmount: (accountNo, amount) => set((state) => ({
    lateAmounts: { ...state.lateAmounts, [accountNo]: amount }
  })),

  deletePayment: async (index) => {
    const state = get();
    const paymentToDelete = state.payments[index];

    if (paymentToDelete._id) {
      try {
        const response = await fetch(`/api/payments/${paymentToDelete._id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete payment");
        }
      } catch (error) {
        toast.error("Error deleting payment");
        return;
      }
    }

    const updatedPayments = state.payments.filter((_, i) => i !== index);
    const updatedReceivedAmounts = { ...state.receivedAmounts };
    const updatedLateAmounts = { ...state.lateAmounts };

    delete updatedReceivedAmounts[paymentToDelete.accountNo];
    delete updatedLateAmounts[paymentToDelete.accountNo];

    if (updatedPayments.length === 0) {
      get().resetState();
    } else {
      set({
        payments: updatedPayments.map((payment, idx) => ({
          ...payment,
          index: idx + 1,
        })),
        receivedAmounts: updatedReceivedAmounts,
        lateAmounts: updatedLateAmounts,
      });
    }
  },

  // Complex operations
  fetchLoanDetails: async (accountNo) => {
    try {
      const response = await fetch(`/api/loans/${accountNo}`);
      if (!response.ok) throw new Error("Loan not found");
      
      const data = await response.json();
      set({ loanDetails: data });
      
      // Calculate late amount after fetching loan details
      await get().calculateLateAmount(data, accountNo);
      return data;
    } catch (error) {
      toast.error("Error fetching loan details: " + (error as Error).message);
      set({ loanDetails: null });
      return null;
    }
  },

  calculateLateAmount: async (details, accountNo) => {
    if (!details) {
      console.error("Loan details missing");
      return;
    }

    try {
      const response = await fetch(`/api/payment-history/${accountNo}`);
      const paymentHistory = await response.json();

      // Your existing late amount calculation logic here
      // Simplified for example - replace with your actual logic
      const lateAmount = 0; // Calculate based on your business logic
      
      set((state) => ({
        lateAmounts: { ...state.lateAmounts, [accountNo]: lateAmount },
        payments: state.payments.map(payment =>
          payment.accountNo === accountNo
            ? {
                ...payment,
                lateAmount,
                amountPaid: payment.isDefaultAmount ? details.instAmount : payment.amountPaid,
              }
            : payment
        ),
      }));
    } catch (error) {
      console.error("Error calculating late amount:", error);
      toast.error("Error calculating payment details");
    }
  },

  savePayments: async () => {
    const state = get();
    if (!state.loanDetails) {
      toast.error("No loan selected");
      return;
    }

    const validPayments = state.payments.filter(
      (p) => p.accountNo && p.amountPaid > 0 && p.accountNo.trim() !== ""
    );

    if (validPayments.length === 0) {
      toast.error("No valid payments to save");
      return;
    }

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: state.loanDetails._id,
          paymentDate: state.selectedDate.toISOString(),
          payments: validPayments.map((p) => ({
            accountNo: p.accountNo.trim(),
            amountPaid: Number(p.amountPaid),
            lateAmount: state.lateAmounts[p.accountNo],
            _id: p._id,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save payments");
      }

      const responseData = await response.json();
      toast.success("Payments saved successfully");
      
      set({
        payments: responseData.payments.map((payment: Payment, index: number) => ({
          ...payment,
          index: index + 1,
        }))
      });

      await get().fetchExistingPayments(state.selectedDate);
    } catch (error) {
      toast.error(`Error saving payments: ${(error as Error).message}`);
    }
  },

  fetchExistingPayments: async (date) => {
    try {
      const formattedDate = date.toISOString().split("T")[0];
      const url = new URL("/api/payments", window.location.origin);
      url.searchParams.set("date", formattedDate);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.payments?.length > 0) {
        const formattedPayments = data.payments.map(
          (payment: Payment, index: number) => ({
            ...payment,
            index: index + 1,
            paymentDate: new Date(payment.paymentDate || date),
            isDefaultAmount: false,
          })
        );

        const receivedAmountsMap: { [key: string]: number } = {};
        formattedPayments.forEach((payment: Payment) => {
          receivedAmountsMap[payment.accountNo] =
            (receivedAmountsMap[payment.accountNo] || 0) + (payment.amountPaid || 0);
        });

        set({
          payments: formattedPayments,
          receivedAmounts: receivedAmountsMap,
        });

        if (formattedPayments[0].accountNo) {
          await get().fetchLoanDetails(formattedPayments[0].accountNo);
        }
      } else {
        get().resetState();
      }
    } catch (error) {
      toast.error("Error fetching existing payments");
      get().resetState();
    }
  },

  resetState: () => set({
    payments: [{
      index: 1,
      accountNo: "",
      amountPaid: 0,
      paymentDate: get().selectedDate,
      lateAmount: 0,
      isDefaultAmount: false,
    }],
    loanDetails: null,
    receivedAmounts: {},
    lateAmounts: {},
  }),
}));

export default usePaymentStore;