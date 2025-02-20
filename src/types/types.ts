// types.ts

export interface LoanFormData {
    accountNo: string;
    loanNo: string;
    date: string;
    mDate: string;
    amount: string;
    period: string;
    isDaily: boolean;
    instAmount: string;
    mAmount: string;
    holderName: string;
    holderAddress: string;
    telephone1: string;
    telephone2: string;
    name: string;
    hasGuarantor: boolean;
    guarantors: GuarantorData[];
  }
  
  export interface GuarantorData {
    holderName: string;
    address: string;
    telephone: string;
    city: string;
  }
  