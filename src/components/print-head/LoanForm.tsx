import React, { useState, useRef } from 'react';

interface LoanFormProps {
  loanType: 'daily' | 'monthly' | 'pending';
  fileCategory: string;
  onLoanAdded: () => void; // Callback to notify parent to refetch loans
  setActiveView: (view: 'form' | 'table') => void; // Callback to switch view
}

const LoanForm: React.FC<LoanFormProps> = ({ loanType, fileCategory, onLoanAdded, setActiveView }) => {
  const [formData, setFormData] = useState({
    accountNo: '',
    nameGujarati: '',
    nameEnglish: '',
    installmentAmount: 0,
    receivedAmount: 0,
    lateAmount: loanType === 'pending' ? 0 : 0,
    totalToBePaid: loanType === 'pending' ? 0 : 0,
    paymentReceivedToday: 0,
    receivedDate: new Date().toISOString().split('T')[0],
    loanType,
    fileCategory,
    index: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Refs for each input field
  const accountNoRef = useRef<HTMLInputElement>(null);
  const nameGujaratiRef = useRef<HTMLInputElement>(null);
  const nameEnglishRef = useRef<HTMLInputElement>(null);
  const installmentAmountRef = useRef<HTMLInputElement>(null);
  const totalToBePaidRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<HTMLInputElement>(null);
  const receivedDateRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'index' || name.includes('Amount') || name === 'totalToBePaid' 
        ? parseFloat(value) || 0 
        : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.index < 1 || formData.index > 90) {
      setError("Index must be between 1 and 90");
      return;
    }

    if (loanType !== 'pending' && formData.installmentAmount < 0) {
      setError("Installment Amount cannot be negative");
      return;
    }

    if (loanType === 'pending') {
      if (formData.totalToBePaid < 0) {
        setError("Total to be paid cannot be negative");
        return;
      }
      formData.lateAmount = 0;
    }
  
    try {
      const response = await fetch('/api/loansDoc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          accountNo: '',
          nameGujarati: '',
          nameEnglish: '',
          installmentAmount: 0,
          receivedAmount: 0,
          lateAmount: loanType === 'pending' ? 0 : 0,
          totalToBePaid: loanType === 'pending' ? 0 : 0,
          paymentReceivedToday: 0,
          receivedDate: new Date().toISOString().split('T')[0],
          loanType,
          fileCategory,
          index: 0,
        });
        setError(null);
        // Notify parent to refetch loans
        onLoanAdded();
        // Switch view back to PaymentTable
        setActiveView('table');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create loan');
      }
    } catch (error) {
      console.error('Error creating loan:', error);
      setError('An error occurred while creating the loan');
    }
  };

  // Handler for Enter key to navigate between fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null> | null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef) {
        nextRef.current?.focus();
        nextRef.current?.select();
      } else {
        handleSubmit(e);
      }
    }
  };

  // Handler to select the full input text on focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-orange-500">
      <h2 className="text-2xl font-bold mb-4 text-orange-700">Add New Borrower</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-gray-700 font-medium">Account Number</label>
            <input
              type="number"
              name="accountNo"
              value={formData.accountNo}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, nameGujaratiRef)}
              onFocus={handleFocus}
              ref={accountNoRef}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-black"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Name (Gujarati)</label>
            <input
              type="text"
              name="nameGujarati"
              value={formData.nameGujarati}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, nameEnglishRef)}
              onFocus={handleFocus}
              ref={nameGujaratiRef}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-black"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Name (English)</label>
            <input
              type="text"
              name="nameEnglish"
              value={formData.nameEnglish}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, loanType !== 'pending' ? installmentAmountRef : totalToBePaidRef)}
              onFocus={handleFocus}
              ref={nameEnglishRef}
              className="w-full px-4 py-2 border rounded-md focus:outline-none text-black focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              required
            />
          </div>

          {loanType !== 'pending' && (
            <div>
              <label className="block mb-1 text-gray-700 font-medium">Installment Amount</label>
              <input
                type="number"
                name="installmentAmount"
                value={formData.installmentAmount}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, indexRef)}
                onFocus={handleFocus}
                ref={installmentAmountRef}
                className="w-full px-4 py-2 border text-black rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                min="0"
                required
              />
            </div>
          )}

          {loanType === 'pending' && (
            <div>
              <label className="block mb-1 text-gray-700 font-medium">Total to be Paid</label>
              <input
                type="number"
                name="totalToBePaid"
                value={formData.totalToBePaid}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, indexRef)}
                onFocus={handleFocus}
                ref={totalToBePaidRef}
                className="w-full px-4 py-2 border text-black rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                min="0"
                required
              />
            </div>
          )}
          <div>
            <label className="block mb-1 text-gray-700 font-medium">Index (1-90)</label>
            <input
              type="number"
              name="index"
              value={formData.index}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, receivedDateRef)}
              onFocus={handleFocus}
              ref={indexRef}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-black focus:border-orange-400"
              min="1"
              max="90"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700 font-medium">Received Date</label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, null)}
              onFocus={handleFocus}
              ref={receivedDateRef}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-black focus:border-orange-400"
              required
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-300 shadow-md"
          >
            Add Borrower
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanForm;