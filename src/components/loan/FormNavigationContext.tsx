import React, { createContext, useRef } from "react";

// Create a context for form navigation
const FormNavigationContext = createContext<{
  registerField: (name: string, ref: HTMLInputElement | HTMLTextAreaElement | null) => void;
  navigateToField: (currentName: string, direction: "up" | "down") => void;
}>({
  registerField: () => {},
  navigateToField: () => {},
});

// Create a provider component
export const FormNavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(
    new Map()
  );
  const fieldOrder = useRef<string[]>([]);

  // Register a field with its reference
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

  // Navigate to the next or previous field
  const navigateToField = (currentName: string, direction: "up" | "down") => {
    const currentIndex = fieldOrder.current.indexOf(currentName);
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === "up") {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = fieldOrder.current.length - 1; // Wrap around
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= fieldOrder.current.length) nextIndex = 0; // Wrap around
    }

    const nextFieldName = fieldOrder.current[nextIndex];
    const nextField = fieldRefs.current.get(nextFieldName);
    if (nextField) {
      nextField.focus();
      if (nextField instanceof HTMLInputElement) {
        nextField.select(); // Select text for input fields
      }
    }
  };

  return (
    <FormNavigationContext.Provider value={{ registerField, navigateToField }}>
      {children}
    </FormNavigationContext.Provider>
  );
};

export default FormNavigationContext;