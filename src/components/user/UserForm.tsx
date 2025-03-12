'use client';

import { useState, useRef, KeyboardEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface UserFormProps {
  onUserAdded: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ onUserAdded }) => {
  const [formData, setFormData] = useState({ 
    holderName: '', 
    name: '', 
    fileNumber: '',
    notes: '' // Add notes to initial state
  });
  const holderNameRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileNumberRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null); // Add ref for notes
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to add user');
      setFormData({ holderName: '', name: '', fileNumber: '', notes: '' });
      onUserAdded();
      toast.success('User added successfully!');
      holderNameRef.current?.focus();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && e.shiftKey)) {
      e.preventDefault();
      switch (field) {
        case 'holderName':
          nameRef.current?.focus();
          break;
        case 'name':
          fileNumberRef.current?.focus();
          break;
        case 'fileNumber':
          notesRef.current?.focus();
          break;
        case 'notes':
          formRef.current?.requestSubmit();
          break;
        default:
          break;
      }
    }
  };

  return (
    <motion.form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-orange-200 to-orange-300 p-6 rounded-2xl shadow-2xl mb-8 dark:from-gray-800 dark:to-gray-700"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-6 text-center">New User Portal</h2>
      <div className="space-y-4">
        <input
          ref={holderNameRef}
          type="text"
          placeholder="Holder Name"
          value={formData.holderName}
          onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, 'holderName')}
          className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:focus:ring-yellow-500 transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 uppercase"
          required
        />
        <input
          ref={nameRef}
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, 'name')}
          className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:focus:ring-yellow-500 transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 uppercase"
          required
        />
        <input
          ref={fileNumberRef}
          type="text"
          placeholder="File Number"
          value={formData.fileNumber}
          onChange={(e) => setFormData({ ...formData, fileNumber: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, 'fileNumber')}
          className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:focus:ring-yellow-500 transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          required
        />
        <textarea
          ref={notesRef}
          placeholder="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, 'notes')}
          className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:focus:ring-yellow-500 transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 min-h-[100px]"
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full py-3 bg-orange-600 dark:bg-orange-700 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors"
        >
          Add User
        </motion.button>
      </div>
    </motion.form>
  );
};

export default UserForm;