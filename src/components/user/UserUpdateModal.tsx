'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface User {
  _id: string;
  holderName: string;
  name: string;
  fileNumber: string;
  notes: string; // Add notes to interface
}

interface UserUpdateModalProps {
  user: User;
  onClose: () => void;
  onUserUpdated: () => void;
}

const UserUpdateModal: React.FC<UserUpdateModalProps> = ({ user, onClose, onUserUpdated }) => {
  const [formData, setFormData] = useState(user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to update user');
      onUserUpdated();
      onClose();
      toast.success('User updated successfully!');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 h-full"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        className="bg-gradient-to-br from-orange-400 to-orange-500 p-6 rounded-2xl shadow-2xl w-full max-w-md dark:from-gray-800 dark:to-gray-700"
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Update User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {['holderName', 'name', 'fileNumber'].map((field) => (
            <input
              key={field}
              type="text"
              value={formData[field as keyof typeof formData]}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              placeholder={field === 'holderName' ? 'Holder Name' : field === 'name' ? 'Name' : 'File Number'}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-orange-300 dark:focus:ring-orange-500 transition-all duration-300"
              required
            />
          ))}
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notes"
            className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-orange-300 dark:focus:ring-orange-500 transition-all duration-300 min-h-[100px] uppercase"
          />
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="flex-1 py-3 bg-orange-600 dark:bg-orange-700 text-white font-semibold rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors"
            >
              Save
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-300 dark:bg-gray-500 text-gray-900 dark:text-gray-100 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default UserUpdateModal;