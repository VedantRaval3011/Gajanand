import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-900 dark:bg-green-800/30 dark:border-green-600 dark:text-green-200';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-900 dark:bg-red-800/30 dark:border-red-600 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-yellow-800/30 dark:border-yellow-600 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-800/30 dark:border-blue-600 dark:text-blue-200';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-900 dark:bg-gray-800/30 dark:border-gray-600 dark:text-gray-200';
    }
  };

  const getIconByType = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

const ToastMessage: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`transform transition-all duration-500 ease-in-out animate-slide-in
      ${getToastStyles(toast.type)}
      flex items-center w-full max-w-sm p-4 mb-4 rounded-lg border shadow-lg`}>
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
        {getIconByType(toast.type)}
      </div>
      <div className="ml-3 text-sm font-normal">
        <span className="mb-1 text-sm font-semibold">{toast.title}</span>
        <div className="text-sm">{toast.message}</div>
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 
        hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
        <span className="sr-only">Close</span>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg">
      {toasts.map(toast => (
        <ToastMessage
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};