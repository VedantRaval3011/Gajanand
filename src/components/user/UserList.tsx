// components/UserList.tsx
'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import UserUpdateModal from './UserUpdateModal';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id: string;
  holderName: string;
  name: string;
  fileNumber: string;
  notes: string; // Add notes to interface
}

interface UserListProps {
  groupedUsers: { [fileNumber: string]: User[] };
  onUserUpdated: () => void;
  onUserDeleted: () => void;
}

const UserList: React.FC<UserListProps> = ({ groupedUsers, onUserUpdated, onUserDeleted }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete user');
        onUserDeleted();
        toast.success('User deleted successfully!');
      } catch (error) {
        toast.error((error as Error).message);
      }
    }
  };

  const toggleFile = (fileNumber: string) => {
    setExpandedFiles((prev) =>
      prev.includes(fileNumber) ? prev.filter((f) => f !== fileNumber) : [...prev, fileNumber]
    );
  };

  return (
    <div className="space-y-6">
      {Object.keys(groupedUsers).length === 0 ? (
        <p className="text-orange-600 dark:text-gray-300 text-center">No users found</p>
      ) : (
        Object.keys(groupedUsers).map((fileNumber) => (
          <motion.div
            key={fileNumber}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-orange-500 to-orange-500 dark:from-orange-700 dark:to-orange-600 p-4 rounded-2xl shadow-lg"
          >
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleFile(fileNumber)}
            >
              <h2 className="font-bold text-orange-100 dark:text-orange-100 text-2xl">File #{fileNumber}</h2>
              <motion.svg
                animate={{ rotate: expandedFiles.includes(fileNumber) ? 180 : 0 }}
                className="w-6 h-6 text-orange-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </div>
            <AnimatePresence>
              {expandedFiles.includes(fileNumber) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-4"
                >
                  {groupedUsers[fileNumber].map((user, index) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-r from-orange-100 to-orange-100 dark:from-orange-200 dark:to-orange-300 p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-orange-700 dark:text-orange-800 font-semibold text-2xl uppercase flex items-center">
                            <span className='inline-flex items-center justify-center bg-orange-500 text-white rounded-full text-base w-7 h-7 mr-2'>{index + 1}</span>
                            {user.holderName}
                          </p>
                          <p className="text-orange-600 dark:text-orange-800 text-xl uppercase">
                            {user.name}
                          </p>
                          {user.notes && (
                            <p className="text-orange-600 dark:text-orange-700 text-base uppercase mt-2 break-words">
                              Notes: {user.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2 shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedUser(user)}
                            className="px-3 py-1 sm:px-4 sm:py-2 bg-orange-500 dark:bg-orange-600 text-white rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors text-sm sm:text-base whitespace-nowrap"
                          >
                            Update
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(user._id)}
                            className="px-3 py-1 sm:px-4 sm:py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors text-sm sm:text-base whitespace-nowrap"
                          >
                            Delete
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))
      )}
      {selectedUser && (
        <UserUpdateModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={onUserUpdated}
        />
      )}
    </div>
  );
};

export default UserList;