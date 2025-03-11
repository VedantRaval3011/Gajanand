// ChequeForm.tsx
'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import type { Cheque } from '@/types/cheque'

interface ChequeFormProps {
  onSubmit: (cheque: Omit<Cheque, '_id'>) => void
  onUpdate?: (id: string, cheque: Partial<Cheque>) => void
  cheque?: Cheque | null
  onCancel?: () => void
}

export default function ChequeForm({ onSubmit, onUpdate, cheque, onCancel }: ChequeFormProps) {
  const [userName, setUserName] = useState('')
  const [bankName, setBankName] = useState('')
  const [notes, setNotes] = useState('')
  const [formFocus, setFormFocus] = useState<string | null>(null)

  useEffect(() => {
    if (cheque) {
      setUserName(cheque.userName || '')
      setBankName(cheque.bankName || '')
      setNotes(cheque.notes || '')
    } else {
      setUserName('')
      setBankName('')
      setNotes('')
    }
  }, [cheque])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (cheque && onUpdate) {
      onUpdate(cheque._id, { userName, bankName, notes })
    } else {
      onSubmit({ userName, bankName, notes, createdAt: new Date().toISOString() })
      setUserName('')
      setBankName('')
      setNotes('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (fieldName === 'userName') document.getElementById('bankName')?.focus()
      else if (fieldName === 'bankName') document.getElementById('notes')?.focus()
      else if (fieldName === 'notes') handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const inputVariants = {
    focused: { scale: 1.03, boxShadow: '0 0 25px rgba(255, 153, 0, 0.4)', y: -5 },
    unfocused: { scale: 1, boxShadow: '0 0 0px rgba(255, 153, 0, 0)', y: 0 }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-900 opacity-30 rounded-xl pointer-events-none" />
      
      <div>
        <label htmlFor="userName" className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 tracking-wider uppercase">
          NAME
        </label>
        <motion.div
          variants={inputVariants}
          animate={formFocus === 'userName' ? 'focused' : 'unfocused'}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative"
        >
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value.toUpperCase())}
            onFocus={() => setFormFocus('userName')}
            onBlur={() => setFormFocus(null)}
            onKeyDown={(e) => handleKeyDown(e, 'userName')}
            className="w-full px-5 py-4 border-0 bg-orange-50 dark:bg-gray-700 bg-opacity-80 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-400 dark:focus:ring-orange-500 backdrop-blur-sm transition-all duration-300 text-lg uppercase font-medium text-gray-800 dark:text-gray-200"
            placeholder="ENTER PAYEE NAME"
            style={{ textTransform: 'uppercase' }}
          />
          <motion.div 
            className="absolute inset-0 border-2 border-orange-300 dark:border-gray-600 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: formFocus === 'userName' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </div>

      <div>
        <label htmlFor="bankName" className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 tracking-wider uppercase">
          BANK NAME
        </label>
        <motion.div
          variants={inputVariants}
          animate={formFocus === 'bankName' ? 'focused' : 'unfocused'}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative"
        >
          <input
            id="bankName"
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value.toUpperCase())}
            onFocus={() => setFormFocus('bankName')}
            onBlur={() => setFormFocus(null)}
            onKeyDown={(e) => handleKeyDown(e, 'bankName')}
            className="w-full px-5 py-4 border-0 bg-orange-50 dark:bg-gray-700 bg-opacity-80 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-400 dark:focus:ring-orange-500 backdrop-blur-sm transition-all duration-300 text-lg uppercase font-medium text-gray-800 dark:text-gray-200"
            placeholder="ENTER BANK NAME"
            style={{ textTransform: 'uppercase' }}
          />
          <motion.div 
            className="absolute inset-0 border-2 border-orange-300 dark:border-gray-600 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: formFocus === 'bankName' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 tracking-wider uppercase">
          NOTES
        </label>
        <motion.div
          variants={inputVariants}
          animate={formFocus === 'notes' ? 'focused' : 'unfocused'}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative"
        >
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.toUpperCase())}
            onFocus={() => setFormFocus('notes')}
            onBlur={() => setFormFocus(null)}
            onKeyDown={(e) => handleKeyDown(e, 'notes')}
            rows={3}
            className="w-full px-5 py-4 border-0 bg-orange-50 dark:bg-gray-700 bg-opacity-80 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-400 dark:focus:ring-orange-500 backdrop-blur-sm transition-all duration-300 text-lg uppercase font-medium text-gray-800 dark:text-gray-200"
            placeholder="ADD AADHAR NUMBER, PAN NO., OR ANY PERSONAL DATA NEEDED"
            style={{ textTransform: 'uppercase' }}
          />
          <motion.div 
            className="absolute inset-0 border-2 border-orange-300 dark:border-gray-600 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: formFocus === 'notes' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </div>

      <div className="flex gap-4 pt-4">
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(255, 128, 0, 0.4)' }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white text-lg font-bold uppercase tracking-wider rounded-lg shadow-lg transition-all duration-300 relative overflow-hidden group"
        >
          <span className="relative z-10">{cheque ? 'UPDATE CHEQUE' : 'ADD CHEQUE'}</span>
          <motion.div 
            className="absolute inset-0 bg-orange-400 dark:bg-orange-500 opacity-0 group-hover:opacity-30"
            initial={{ x: '-100%' }}
            whileHover={{ x: '0%' }}
            transition={{ type: 'tween', duration: 0.4 }}
          />
        </motion.button>

        {cheque && onCancel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onCancel}
            className="py-4 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-lg font-bold uppercase tracking-wider rounded-lg shadow-md transition-all duration-300"
          >
            CANCEL
          </motion.button>
        )}
      </div>
    </form>
  )
}