import { LoanFormData } from "@/types/types";

export const validateForm = (
  formData: LoanFormData
): Partial<Record<keyof LoanFormData, string>> & { [key: string]: string } => {
  const errors: Partial<Record<keyof LoanFormData, string>> & { [key: string]: string } = {};

  // Account number validation
  if (!formData.accountNo.trim()) {
    errors.accountNo = 'Account number is required';
  } else if (!/^\d{1,20}$/.test(formData.accountNo)) {
    errors.accountNo = 'Account number must be 1-12 digits';
  }

  // Loan number validation
  if (!formData.loanNo.trim()) {
    errors.loanNo = 'Loan number is required';
  } else if (!/^\d{1,10}$/.test(formData.loanNo)) {
    errors.loanNo = 'Loan number must be 1-20 digits';
  }

  // Amount validation
  if (!formData.amount) {
    errors.amount = 'Amount is required';
  } else if (Number(formData.amount) <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }

  // Period validation
  if (!formData.period) {
    errors.period = 'Period is required';
  } else if (Number(formData.period) <= 0) {
    errors.period = 'Period must be greater than 0';
  }

  // Installment amount validation
  if (!formData.instAmount) {
    errors.instAmount = 'Installment amount is required';
  } else if (Number(formData.instAmount) <= 0) {
    errors.instAmount = 'Installment amount must be greater than 0';
  }

  // Maturity amount validation
  if (!formData.mAmount) {
    errors.mAmount = 'Maturity amount is required';
  } else if (Number(formData.mAmount) <= 0) {
    errors.mAmount = 'Maturity amount must be greater than 0';
  } 

  // Holder information validation
  if (!formData.holderName.trim()) {
    errors.holderName = 'Holder name is required';
  }

  if (!formData.holderAddress.trim()) {
    errors.holderAddress = 'Address is required';
  }

  if (!formData.telephone1.trim()) {
    errors.telephone1 = 'Primary telephone is required';
  } else if (!/^\d{10}$/.test(formData.telephone1)) {
    errors.telephone1 = 'Invalid telephone number';
  }

  if (formData.telephone2 && !/^\d{10}$/.test(formData.telephone2)) {
    errors.telephone2 = 'Invalid telephone number';
  }

  // Guarantor validation
  if (formData.hasGuarantor && formData.guarantors.length > 0) {
    formData.guarantors.forEach((guarantor, index) => {
      if (!guarantor.holderName.trim()) {
        (errors)[`guarantors[${index}].holderName`] = 'Guarantor name is required';
      }
    });
  } 

  return errors;
};