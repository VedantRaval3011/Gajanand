import { create } from 'zustand';

interface ProductStore {
  lateAmount: number;
  receivedAmount: number;
  totalToBePaid: number;
  setLateAmount: (amount: number) => void;
  setReceivedAmount: (amount: number) => void;
  setTotalToBePaid: (amount: number) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  lateAmount: 0,
  receivedAmount: 0,
  totalToBePaid: 0,
  setLateAmount: (amount) => set({ lateAmount: amount }),
  setReceivedAmount: (amount) => set({ receivedAmount: amount }),
  setTotalToBePaid: (amount) => set({ totalToBePaid: amount }),
}));