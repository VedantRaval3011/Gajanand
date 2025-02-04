// components/FormInput.tsx
import React, { KeyboardEvent, RefCallback } from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'tel' | 'date';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  inputRef?: RefCallback<HTMLInputElement>;
  placeholder?: string;
  required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onKeyDown,
  error,
  inputRef,
  placeholder,
  required,
}) => {
  return (
    <div>
      <label className="block text-xl font-medium text-gray-700 dark:text-gray-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`mt-2 block w-full rounded-md border ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        } px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
          error ? 'focus:border-red-500 focus:ring-red-500' : 'focus:border-blue-500 focus:ring-blue-500'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormInput;