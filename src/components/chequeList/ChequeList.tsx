// ChequeList.tsx
'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { Cheque } from '@/types/cheque';

interface ChequeListProps {
  cheques: Cheque[];
  onEdit: (cheque: Cheque) => void;
  onDelete: (id: string) => void;
}

export default function ChequeList({ cheques, onEdit, onDelete }: ChequeListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCheques, setFilteredCheques] = useState<Cheque[]>(cheques);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCheques(cheques);
      return;
    }
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = cheques.filter(cheque => 
      (cheque.userName?.toLowerCase().includes(searchTermLower) || 
      cheque.bankName?.toLowerCase().includes(searchTermLower))
    );
    setFilteredCheques(filtered);
  }, [searchTerm, cheques]);

  const searchInputVariants = {
    focused: { 
      scale: 1.02, 
      boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)',
    },
    unfocused: { 
      scale: 1, 
      boxShadow: '0 0 0px rgba(249, 115, 22, 0)',
    }
  };

  if (cheques.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12 px-4 text-gray-700 dark:text-gray-300 bg-orange-100 dark:bg-gray-800 rounded-xl shadow-lg"
      >
        <motion.div className="inline-block p-5 rounded-full bg-orange-200 dark:bg-gray-700 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-16 sm:w-16 text-orange-500 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </motion.div>
        <p className="text-xl sm:text-3xl font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">NO CHEQUES ADDED</p>
        <p className="text-base sm:text-xl mt-2 uppercase text-orange-500 dark:text-orange-300">ADD A NEW CHEQUE TO GET STARTED</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div
        variants={searchInputVariants}
        animate={isSearchFocused ? 'focused' : 'unfocused'}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="relative"
      >
        <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 dark:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="w-full pl-9 sm:pl-12 pr-10 py-3 sm:py-4 border-2 border-orange-300 dark:border-gray-600 bg-orange-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-orange-400 dark:focus:border-orange-500 transition-all duration-300 text-base sm:text-lg font-medium text-gray-800 dark:text-gray-200"
          placeholder="SEARCH BY NAME OR BANK..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          style={{ textTransform: 'uppercase' }}
        />
        {searchTerm && (
          <button
            className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
            onClick={() => setSearchTerm('')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </motion.div>

      {searchTerm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-orange-100 dark:bg-gray-800 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-orange-200 dark:border-gray-700"
        >
          <p className="text-orange-700 dark:text-orange-300 font-medium text-sm sm:text-base">
            {filteredCheques.length === 0 
              ? 'NO RESULTS FOUND' 
              : `FOUND ${filteredCheques.length} ${filteredCheques.length === 1 ? 'RESULT' : 'RESULTS'}`}
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-4 sm:space-y-6 max-h-[500px] overflow-y-auto pr-1 sm:pr-2"
      >
        {filteredCheques.length === 0 && searchTerm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <p className="text-lg sm:text-xl font-bold uppercase">NO MATCHING CHEQUES</p>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">Try a different search term</p>
          </motion.div>
        ) : (
          filteredCheques.map((cheque) => (
            <motion.div
              key={cheque._id}
              whileHover={{ boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg border border-orange-300 dark:border-gray-700 shadow-md"
            >
              <div className="flex justify-between sm:items-center gap-3 mb-3 sm:mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-300 tracking-wide sm:tracking-widest uppercase line-clamp-1">
                  {cheque.userName || 'UNNAMED'}
                </h3>
                <div className="flex space-x-1 sm:space-x-2 self-end sm:self-auto">
                  <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onEdit(cheque)}
                    className="p-2 sm:p-3 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDelete(cheque._id)}
                    className="p-2 sm:p-3 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </motion.button>
                </div>
              </div>
              <p className="text-base sm:text-lg uppercase text-gray-700 dark:text-gray-300 font-semibold truncate">
                BANK: {cheque.bankName || 'N/A'}
              </p>
              {cheque.notes && (
                <p className="text-base sm:text-lg mt-2 sm:mt-3 uppercase text-gray-600 dark:text-gray-400 font-medium line-clamp-2">
                  NOTES: {cheque.notes}
                </p>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}