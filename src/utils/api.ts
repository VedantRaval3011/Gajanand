import { LoanFormData } from "@/types/types";

const API_BASE_URL = '/api/loans'; // Replace with your actual API base URL

export const api = {
  async getLoan(loanId: string): Promise<LoanFormData> {
    const response = await fetch(`${API_BASE_URL}/${loanId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch loan data');
    }
    return response.json();
  },

  async createLoan(loanData: LoanFormData): Promise<{ id: string }> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loanData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create loan');
    }
    
    return response.json();
  },

  async updateLoan(loanId: string, loanData: LoanFormData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${loanId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loanData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update loan');
    }
  }
};