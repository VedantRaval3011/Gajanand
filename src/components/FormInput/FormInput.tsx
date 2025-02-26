import React, {
  KeyboardEvent,
  RefCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";

// Create a context for form navigation
const FormNavigationContext = createContext<{
  registerField: (
    name: string,
    ref: HTMLInputElement | HTMLTextAreaElement | null
  ) => void;
  navigateToField: (currentName: string, direction: "up" | "down") => void;
}>({
  registerField: () => {},
  navigateToField: () => {},
});

// Create a provider component
export const FormNavigationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(
    new Map()
  );
  const fieldOrder = useRef<string[]>([]);

  const registerField = (
    name: string,
    ref: HTMLInputElement | HTMLTextAreaElement | null
  ) => {
    if (ref) {
      fieldRefs.current.set(name, ref);
      if (!fieldOrder.current.includes(name)) {
        fieldOrder.current.push(name);
      }
    } else {
      fieldRefs.current.delete(name);
    }
  };

  const navigateToField = (currentName: string, direction: "up" | "down") => {
    const currentIndex = fieldOrder.current.indexOf(currentName);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === "up") {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = fieldOrder.current.length - 1;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= fieldOrder.current.length) nextIndex = 0;
    }

    const nextFieldName = fieldOrder.current[nextIndex];
    const nextField = fieldRefs.current.get(nextFieldName);
    if (nextField) {
      nextField.focus();
      if (nextField instanceof HTMLInputElement) {
        nextField.select();
      }
    }
  };

  return (
    <FormNavigationContext.Provider value={{ registerField, navigateToField }}>
      {children}
    </FormNavigationContext.Provider>
  );
};

interface FormInputProps {
  label: string;
  name: string;
  type?: "text" | "number" | "tel" | "date";
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  inputRef?: RefCallback<HTMLInputElement>;
  placeholder?: string;
  required?: boolean;
  autofocus?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  autoSelect?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; // Updated to accept FocusEvent
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type,
  value,
  onChange,
  onKeyDown,
  error,
  inputRef,
  placeholder,
  required,
  autofocus,
  onFocus,
  autoSelect,
  onBlur, // Add onBlur to the destructured props
}) => {
  const innerRef = useRef<HTMLInputElement>(null);
  const hasFocusedRef = useRef(false);

  // Consume the FormNavigationContext
  const { registerField, navigateToField } = useContext(FormNavigationContext);

  useEffect(() => {
    // Register the field with the navigation system
    registerField(name, innerRef.current);
    return () => registerField(name, null); // Cleanup on unmount
  }, [name, registerField]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      navigateToField(name, e.key === "ArrowUp" ? "up" : "down");
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoSelect) {
      if (!hasFocusedRef.current || name === "accountNo") {
        e.target.select();
      }
    }
    hasFocusedRef.current = true;
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (name === "accountNo") {
      hasFocusedRef.current = false;
    }
    if (onBlur) {
      onBlur(e); // Call the onBlur prop if it exists
    }
  };

  return (
    <div>
      <label className="block text-xl md:text-xl  text-gray-700 dark:text-gray-200 font-bold">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        ref={(el) => {
          innerRef.current = el;
          if (inputRef) {
            inputRef(el);
          }
        }}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur} // Pass the handleBlur function
        placeholder={placeholder}
        autoFocus={name === "accountNo" || autofocus}
        className={`mt-2 block w-full rounded-md border font-bold text-xl focus:border-orange-500 uppercase ${
          error ? "border-red-500" : "border-gray-300 dark:border-orange-600"
        } px-4 py-3 text-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
          error
            ? "focus:border-red-500 focus:ring-red-500"
            : "focus:border-orange-500 focus:ring-orange-500"
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormInput;