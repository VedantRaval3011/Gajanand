import React, { useRef, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface AlertProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  isOpen: boolean;
  onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({
  title = "Alert",
  description = "This action requires your attention.",
  actionLabel = "OK",
  isOpen,
  onClose
}) => {
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the OK button when dialog opens
      setTimeout(() => {
        okButtonRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className='bg-white dark:bg-gray-800'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-gray-600 dark:text-gray-200'>{title}</AlertDialogTitle>
          <AlertDialogDescription className='text-gray-600 dark:text-gray-400'>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            ref={okButtonRef}
            onClick={onClose}
            className="w-full sm:w-auto bg-orange-500"
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Alert;