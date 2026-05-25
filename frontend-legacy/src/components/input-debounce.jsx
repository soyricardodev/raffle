import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const DebounceInput = ({
  value = '',
  onChangeDebounce,
  placeholder = 'Buscar...',
  className = '',
  delay = 300,
  disabled = false,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const debounceRef = useRef(null);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced callback
    debounceRef.current = setTimeout(() => {
      onChangeDebounce(newValue);
    }, delay);
  };

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        size={16}
      />
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
    </div>
  );
};

export default DebounceInput;